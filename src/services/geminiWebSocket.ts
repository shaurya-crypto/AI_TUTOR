import { GoogleGenAI, Type, Behavior } from '@google/genai';

export interface GeminiLiveCallbacks {
  onSetupComplete: () => void;
  onAudioData: (pcmData: Int16Array, sampleRate: number) => void;
  onInterrupted: () => void;
  onTurnComplete: () => void;
  onTranscript: (text: string, sender: "user" | "teacher") => void;
  onError: (error: Error) => void;
  onClose: (event: CloseEvent) => void;
  onUserSpeechStart?: () => void;
  onChalkboardToolCall?: (action: string, content: any, color?: string) => void;
  onVisualAction?: (action: string, params: Record<string, any>) => void;
}

export class GeminiLiveClient {
  private ai: GoogleGenAI;
  private session: any | null = null;
  private apiKey: string;
  private model: string;
  private voiceName: string;
  private systemInstruction: string;
  private callbacks: GeminiLiveCallbacks;
  private isManuallyClosed: boolean = false;
  private isConnected: boolean = false;
  private hasSentKickoff: boolean = false;
  private pendingKickoffText: string | null = null;
  private enableFunctionCalling: boolean = false;
  private executedToolCallIds = new Set<string>();

  constructor(
    authTokenOrApiKey: string,
    callbacks: GeminiLiveCallbacks,
    options?: {
      model?: string;
      voiceName?: string;
      systemInstruction?: string;
      enableFunctionCalling?: boolean;
    }
  ) {
    this.apiKey = authTokenOrApiKey;
    this.callbacks = callbacks;
    let model = options?.model || "gemini-3.8-live";
    if (model.startsWith("models/")) {
      model = model.replace("models/", "");
    }
    this.model = model;
    this.voiceName = options?.voiceName || "Aoede";
    this.enableFunctionCalling = options?.enableFunctionCalling ?? false;
    this.systemInstruction =
      options?.systemInstruction ||
      "You are an inspiring, patient Senior Academic Tutor conducting an engaging 1-on-1 spoken tutoring session with a live chalkboard. Explain concepts very simply using tangible, context-based real-world intuition. Speak continuously without stopping in the middle, write key notes on the chalkboard using inline tags, and ALWAYS end every spoken turn with a clear checkpoint question for the student.";
    this.ai = new GoogleGenAI({
      apiKey: this.apiKey,
      httpOptions: { apiVersion: "v1alpha" },
    });
  }

  private extractAndExecuteEmbeddedToolCalls(rawText: string): string {
    if (!rawText) return rawText;

    // 1. Match pseudo-code: write_chalkboard(action="...", content="...", color="...")
    const chalkboardRegex = /write_chalkboard\s*\(\s*(?:action\s*=\s*)?["']?([a-zA-Z0-9_\-]+)["']?\s*(?:,\s*(?:content\s*=\s*)?(?:["']([^"']*)["']|([^"',\)]*)))?(?:\s*,\s*(?:color\s*=\s*)?["']?([a-zA-Z0-9_#]+)["']?)?\s*\)/gi;
    let m;
    while ((m = chalkboardRegex.exec(rawText)) !== null) {
      const action = m[1]?.trim() || "";
      const content = (m[2] ?? m[3] ?? "").trim();
      const color = m[4]?.trim() || undefined;
      if (action) {
        this.handleSingleToolCall("write_chalkboard", { action, content, color });
      }
    }

    // 2. Match execute_visual_action(action="...", parameters={...})
    const visualRegex = /execute_visual_action\s*\(\s*(?:action\s*=\s*)?["']?([a-zA-Z0-9_\-]+)["']?\s*(?:,\s*(?:parameters\s*=\s*)?(\{.*?\})|\s*,\s*([^,\)]+))?\s*\)/gi;
    let vm;
    while ((vm = visualRegex.exec(rawText)) !== null) {
      const action = vm[1]?.trim() || "";
      let parameters: Record<string, any> = {};
      const rawParams = vm[2] || vm[3];
      if (rawParams) {
        try {
          parameters = JSON.parse(rawParams);
        } catch {
          // ignore parsing error
        }
      }
      if (action) {
        this.handleSingleToolCall("execute_visual_action", { action, parameters });
      }
    }

    // 3. Match draw_shape(...)
    const shapeRegex = /draw_shape\s*\(\s*([^()]+)\)/gi;
    let sm;
    while ((sm = shapeRegex.exec(rawText)) !== null) {
      const argStr = sm[1];
      try {
        if (argStr.trim().startsWith('{')) {
          this.handleSingleToolCall("draw_shape", JSON.parse(argStr.trim()));
        } else {
          this.handleSingleToolCall("draw_shape", { shape: argStr.trim() });
        }
      } catch {}
    }

    // 4. Match render_svg_diagram(...)
    const svgRegex = /render_svg_diagram\s*\(([\s\S]*?)\)/gi;
    let svgm;
    while ((svgm = svgRegex.exec(rawText)) !== null) {
      const body = svgm[1]?.trim() || "";
      if (!body) continue;
      if (body.startsWith("{")) {
        try {
          const parsed = JSON.parse(body);
          if (parsed.svg) {
            this.handleSingleToolCall("render_svg_diagram", parsed);
          }
        } catch {}
      } else {
        const explicitTitle = body.match(/\btitle\s*=\s*["']([^"']*)["']/i);
        const explicitSvg = body.match(/\bsvg\s*=\s*["']([\s\S]*?)["'](?:\s*,\s*[a-zA-Z_]+\s*=|\s*$)/i);
        const explicitCaption = body.match(/\bcaption\s*=\s*["']([^"']*)["']/i);
        if (explicitSvg) {
          const title = explicitTitle ? explicitTitle[1] : "Educational Diagram";
          const svg = explicitSvg[1];
          const caption = explicitCaption ? explicitCaption[1] : "";
          this.handleSingleToolCall("render_svg_diagram", { title, svg, caption });
        } else {
          const posMatch = body.match(/["']([^"']*)["']\s*,\s*["']([\s\S]*?)["'](?:\s*,\s*["']([^"']*)["'])?/);
          if (posMatch) {
            this.handleSingleToolCall("render_svg_diagram", {
              title: posMatch[1],
              svg: posMatch[2],
              caption: posMatch[3] || "",
            });
          }
        }
      }
    }

    // 5. Strip any leaked tool calls and bracket directives from spoken transcript text
    const stripCall = (name: string) => new RegExp(`${name}\\s*\\((?:'[^']*'|"[^"]*"|[^()]*|\\([^()]*\\))*\\)`, "gi");
    return rawText
      .replace(stripCall("write_chalkboard"), "")
      .replace(stripCall("execute_visual_action"), "")
      .replace(stripCall("plot_mathematical_graph"), "")
      .replace(stripCall("open_interactive_simulation"), "")
      .replace(stripCall("update_interactive_simulation"), "")
      .replace(stripCall("draw_shape"), "")
      .replace(stripCall("solve_step_by_step_numerical"), "")
      .replace(stripCall("conclude_and_open_quiz"), "")
      .replace(stripCall("render_svg_diagram"), "")
      .replace(/render_svg_diagram\s*\([\s\S]*?\)/gi, "")
      .replace(/\[[A-Z_]+(?::\s*[^\]]*)?\]/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  private handleSingleToolCall(name: string, args: any, callId?: string): void {
    if (callId) {
      if (this.executedToolCallIds.has(callId)) {
        return;
      }
      this.executedToolCallIds.add(callId);
      if (this.executedToolCallIds.size > 200) {
        const first = this.executedToolCallIds.values().next().value;
        if (first) this.executedToolCallIds.delete(first);
      }
    }
    if (name === "write_chalkboard") {
      const action = args.action || "";
      const textContent = args.content || args.text || "";
      const color = args.color || "";
      this.callbacks.onChalkboardToolCall?.(action, textContent, color);
    } else if (name === "execute_visual_action") {
      const action = args.action || "";
      const parameters = args.parameters || {};
      this.callbacks.onVisualAction?.(action, parameters);
    } else if (name === "plot_mathematical_graph") {
      const formatted = [
        args.formula ? `formula=${args.formula}` : '',
        args.domain ? `domain=${args.domain}` : '',
        args.range ? `range=${args.range}` : '',
        args.title ? `title=${args.title}` : '',
        args.callout ? `callout=${args.callout}` : '',
        args.points ? `points=${args.points}` : '',
      ].filter(Boolean).join(' | ') || args.formula || 'linear';
      this.callbacks.onChalkboardToolCall?.("draw_graph", formatted);
    } else if (name === "open_interactive_simulation") {
      const sceneType = args.sceneType || "geometry";
      const parameters = args.parameters || {};
      const title = args.title || parameters.title;
      this.callbacks.onVisualAction?.("SHOW_SCENE", { sceneType, title, ...parameters });
    } else if (name === "update_interactive_simulation") {
      const parameters = args.parameters || args;
      const title = args.title || parameters.title;
      this.callbacks.onVisualAction?.("UPDATE_SCENE", { title, ...parameters });
    } else if (name === "draw_shape") {
      this.callbacks.onChalkboardToolCall?.("draw_shape", args, args.color);
    } else if (name === "solve_step_by_step_numerical") {
      this.callbacks.onChalkboardToolCall?.("draw_numerical", args);
    } else if (name === "render_svg_diagram") {
      const title = args.title || "Educational Diagram";
      const svg = args.svg || "";
      const caption = args.caption || "";
      this.callbacks.onChalkboardToolCall?.("render_svg_diagram", { title, svg, caption });
    } else if (name === "conclude_and_open_quiz") {
      if (args.summary) {
        this.callbacks.onChalkboardToolCall?.("chapter_summary", args.summary);
      }
      this.callbacks.onChalkboardToolCall?.("open_quiz", args.summary || "10-MCQ Diagnostic Evaluation");
    } else {
      this.callbacks.onChalkboardToolCall?.(name, typeof args === 'string' ? args : JSON.stringify(args));
    }
  }

  public async connect(kickoffPrompt?: string): Promise<void> {
    if (this.session) return;
    this.isManuallyClosed = false;
    this.hasSentKickoff = false;
    if (kickoffPrompt) {
      this.pendingKickoffText = kickoffPrompt;
    }

    try {
      console.log(`[GeminiLive] Connecting session with model: ${this.model}, voice: ${this.voiceName}, enableFunctionCalling: ${this.enableFunctionCalling}`);

      const liveConfig: any = {
        responseModalities: ["AUDIO" as any],
        systemInstruction: { parts: [{ text: this.systemInstruction }] },
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: this.voiceName,
            },
          },
        },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      };

      if (this.enableFunctionCalling) {
        liveConfig.tools = [
          {
            functionDeclarations: [
              {
                name: "write_chalkboard",
                description: "Draw or write notes, titles, formulas, steps, rough scratch work, math equations, tables, flowcharts, or set chalk colors on the student's live whiteboard.",
                behavior: Behavior.NON_BLOCKING,
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    action: {
                      type: Type.STRING,
                      enum: [
                        "draw_title",
                        "draw_note",
                        "draw_step",
                        "draw_highlight_box",
                        "draw_question",
                        "draw_student_answer",
                        "draw_answer_verdict",
                        "draw_exam_question",
                        "draw_flowchart",
                        "draw_table",
                        "draw_rough_work",
                        "concept_done",
                        "concept_focus",
                        "set_color",
                        "new_page",
                      ],
                      description: "The chalkboard action to perform (e.g. draw_note, draw_step, draw_highlight_box, draw_question, draw_student_answer, draw_answer_verdict, draw_exam_question, draw_flowchart, draw_table, draw_rough_work, concept_done, concept_focus, set_color, new_page)",
                    },
                    content: {
                      type: Type.STRING,
                      description: "The text to write, equation, table markup, flowchart text, or color name to apply to the chalkboard.",
                    },
                    color: {
                      type: Type.STRING,
                      enum: [
                        "white",
                        "primary",
                        "botanical",
                        "green",
                        "coral",
                        "red",
                        "amber",
                        "yellow",
                        "blue",
                        "cyan",
                        "purple",
                        "lavender",
                        "rose",
                      ],
                      description: "Optional chalk color to write with (botanical, coral, amber, blue, purple, white). Use botanical/green for biology/definitions, coral/red for laws & boxed formulas, blue for physics/derivations, amber/yellow for SI units/highlights, purple for terms, white for standard text.",
                    },
                  },
                  required: ["action"],
                },
              },
              {
                name: "execute_visual_action",
                description: "Present or update interactive visual teaching elements on the multimedia stage (images, videos, 3D scenes, graphs, progressive diagrams, animations, or quick checks).",
                behavior: Behavior.NON_BLOCKING,
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    action: {
                      type: Type.STRING,
                      enum: [
                        "SHOW_MEDIA",
                        "SHOW_SCENE",
                        "UPDATE_GRAPH",
                        "REVEAL_DIAGRAM_STEP",
                        "HIGHLIGHT_BOARD",
                        "PLAY_ANIMATION",
                        "PAUSE_MEDIA",
                        "ASK_CHECK",
                        "SAVE_LESSON_POSITION",
                        "UPDATE_SCENE",
                        "CLOSE_SCENE",
                      ],
                      description: "The visual action to execute on the stage",
                    },
                    parameters: {
                      type: Type.OBJECT,
                      description: "Action-specific parameters (e.g. sceneType, stepIndex, variableName, value, url)",
                    },
                  },
                  required: ["action"],
                },
              },
              {
                name: "plot_mathematical_graph",
                description: "Plot a mathematical or scientific function graph directly on the whiteboard canvas (e.g. linear, quadratic parabola, trigonometric curve, velocity-time, distance-time, or custom formula).",
                behavior: Behavior.NON_BLOCKING,
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    formula: {
                      type: Type.STRING,
                      description: "The mathematical formula to plot, e.g. 'x^2 - 4' or '2x + 1' or 'velocity-time' or 'sin(x)'",
                    },
                    domain: {
                      type: Type.STRING,
                      description: "Domain range for x-axis, e.g. '[-5, 5]'",
                    },
                    range: {
                      type: Type.STRING,
                      description: "Range for y-axis, e.g. '[-10, 10]'",
                    },
                    title: {
                      type: Type.STRING,
                      description: "Graph title, e.g. 'Quadratic Parabola: y = x^2 - 4'",
                    },
                    callout: {
                      type: Type.STRING,
                      description: "Key features or annotations, e.g. 'Roots at x = -2, 2 | Minimum at (0, -4)'",
                    },
                    points: {
                      type: Type.STRING,
                      description: "Critical coordinate points to highlight, e.g. '(0, -4), (2, 0), (-2, 0)'",
                    },
                  },
                  required: ["formula"],
                },
              },
              {
                name: "render_svg_diagram",
                description: "Render a clean, high-precision vector SVG educational diagram on the chalkboard (e.g. physics apparatus, ray diagrams, chemical apparatus, biological structures, or mathematical geometric figures).",
                behavior: Behavior.NON_BLOCKING,
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    title: {
                      type: Type.STRING,
                      description: "Title of the diagram (e.g. 'Reflection of Light at Plane Mirror', 'Structure of Plant Cell', 'Electrolysis of Water')",
                    },
                    svg: {
                      type: Type.STRING,
                      description: "Well-formed XML SVG markup string with viewBox, paths, rects, circles, lines, and text labels with contrasting colors (e.g. #171817, #52715D, #C85A43, #D97706, #0284C7).",
                    },
                    caption: {
                      type: Type.STRING,
                      description: "Optional pedagogical caption, law explanation, or annotation note.",
                    },
                  },
                  required: ["title", "svg"],
                },
              },
              {
                name: "draw_shape",
                description: "Draw custom 2D or 3D geometric shapes (rectangle, square, circle, ellipse, triangle, right_triangle, cylinder, cube, polygon, line, arrow) on the whiteboard with complete control over width, height, radius, labels, and colors.",
                behavior: Behavior.NON_BLOCKING,
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    shape: {
                      type: Type.STRING,
                      enum: [
                        "rectangle",
                        "square",
                        "circle",
                        "ellipse",
                        "triangle",
                        "right_triangle",
                        "cylinder",
                        "cube",
                        "cuboid",
                        "polygon",
                        "line",
                        "arrow",
                      ],
                      description: "The geometric shape to draw",
                    },
                    width: {
                      type: Type.NUMBER,
                      description: "Width in pixels (e.g. 80 to 720)",
                    },
                    height: {
                      type: Type.NUMBER,
                      description: "Height in pixels (e.g. 40 to 450)",
                    },
                    radius: {
                      type: Type.NUMBER,
                      description: "Radius in pixels for circle or cylinder (e.g. 30 to 200)",
                    },
                    label: {
                      type: Type.STRING,
                      description: "Educational formula, dimension callout, or label (e.g. 'Length = 30cm, Breadth = 15cm | Area = 450cm²')",
                    },
                    color: {
                      type: Type.STRING,
                      enum: [
                        "botanical",
                        "coral",
                        "blue",
                        "amber",
                        "purple",
                        "white",
                      ],
                      description: "Chalk stroke color",
                    },
                    fillColor: {
                      type: Type.STRING,
                      description: "Optional background fill color",
                    },
                  },
                  required: ["shape"],
                },
              },
              {
                name: "open_interactive_simulation",
                description: "Summon an interactive 3D WebGL geometry solid or cross-section model directly on the whiteboard stage with full control over title, shape, and dimensions.",
                behavior: Behavior.NON_BLOCKING,
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    sceneType: {
                      type: Type.STRING,
                      enum: [
                        "geometry_3d",
                        "geometry_cross_section",
                      ],
                      description: "The 3D geometric simulation scene to open ('geometry_3d' for 3D solids or 'geometry_cross_section' for cutting plane slices)",
                    },
                    title: {
                      type: Type.STRING,
                      description: "Custom title for the 3D model simulation",
                    },
                    parameters: {
                      type: Type.OBJECT,
                      description: "Dynamic simulation parameters and values (e.g. { shape: 'cylinder', radius: 4, height: 8 })",
                    },
                  },
                  required: ["sceneType"],
                },
              },
              {
                name: "update_interactive_simulation",
                description: "Update values, variables, sliders, or title of the currently active 3D simulation scene in real time (e.g. adjust shape, change radius or height, alter slice angle).",
                behavior: Behavior.NON_BLOCKING,
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    title: {
                      type: Type.STRING,
                      description: "Updated title for the simulation",
                    },
                    parameters: {
                      type: Type.OBJECT,
                      description: "Updated parameters and values to apply to the 3D model",
                    },
                  },
                },
              },
              {
                name: "solve_step_by_step_numerical",
                description: "Format and write an authentic step-by-step board exam numerical solution on the whiteboard with complete standard layout: Given, Formula, Substitution, Scratchpad Calculation, and Boxed Answer with SI units.",
                behavior: Behavior.NON_BLOCKING,
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    problem: {
                      type: Type.STRING,
                      description: "The problem statement",
                    },
                    given: {
                      type: Type.STRING,
                      description: "Given values with standard symbols and units",
                    },
                    formula: {
                      type: Type.STRING,
                      description: "Standard equation or law formula",
                    },
                    substitution: {
                      type: Type.STRING,
                      description: "Numerical substitution step",
                    },
                    calculation: {
                      type: Type.STRING,
                      description: "Scratchpad arithmetic calculations",
                    },
                    answer: {
                      type: Type.STRING,
                      description: "Final calculated numerical answer",
                    },
                    unit: {
                      type: Type.STRING,
                      description: "SI or board standard unit",
                    },
                  },
                  required: ["answer"],
                },
              },
              {
                name: "conclude_and_open_quiz",
                description: "Conclude the teaching capsule, write the comprehensive chapter synthesis summary on the whiteboard, and prompt the student to open the 10-MCQ evaluation quiz.",
                behavior: Behavior.NON_BLOCKING,
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    summary: {
                      type: Type.STRING,
                      description: "The chapter synthesis summary covering all key definitions, formulas, and laws taught",
                    },
                  },
                  required: ["summary"],
                },
              },
            ],
          },
        ];
      }

      this.session = await this.ai.live.connect({
        model: this.model,
        config: liveConfig,
        callbacks: {
          onopen: () => {
            console.log("[GeminiLive] WebSocket TCP connection open; awaiting setupComplete...");
          },
          onmessage: (msg: any) => {
             const content = msg.serverContent;
             
             // Server Voice Activity Detection (VAD) events
             const isVoiceActivityStart = msg.voiceActivity?.voiceActivityType === "ACTIVITY_START" || msg.voiceActivity?.type === "ACTIVITY_START";
             if (isVoiceActivityStart) {
                this.callbacks.onUserSpeechStart?.();
             }

             // Handle root tool calls for chalkboard writing, visual stage, and dedicated tools
             if (msg.toolCall && msg.toolCall.functionCalls) {
               const responses: any[] = [];
               for (const call of msg.toolCall.functionCalls) {
                 this.handleSingleToolCall(call.name, call.args || {}, call.id);
                 responses.push({
                   id: call.id,
                   name: call.name,
                   response: { result: "ok" },
                 });
               }
               if (responses.length > 0 && this.session) {
                 try {
                   this.session.sendToolResponse({ functionResponses: responses });
                 } catch (e) {
                   console.warn("[GeminiLive] Failed to send tool response:", e);
                 }
               }
             }

             if (!content) return;

             if (content.interrupted) {
               this.callbacks.onInterrupted();
               return;
             }
             
             // Transcripts extraction
             if (content.inputTranscription && content.inputTranscription.text) {
               this.callbacks.onTranscript(content.inputTranscription.text, "user");
             }
             if (content.inputTranscription && content.inputTranscription.parts) {
               for (const part of content.inputTranscription.parts) {
                   if (part.text) {
                       this.callbacks.onTranscript(part.text, "user");
                   }
               }
             }
             
             let hasTeacherTranscript = false;
             if (content.outputTranscription && content.outputTranscription.text) {
               const cleaned = this.extractAndExecuteEmbeddedToolCalls(content.outputTranscription.text);
                if (cleaned) this.callbacks.onTranscript(cleaned, "teacher");
               hasTeacherTranscript = true;
             }
             if (content.outputTranscription && content.outputTranscription.parts) {
               for (const part of content.outputTranscription.parts) {
                 if (part.text) {
                   const cleaned = this.extractAndExecuteEmbeddedToolCalls(part.text);
                   if (cleaned) {
                     this.callbacks.onTranscript(cleaned, "teacher");
                     hasTeacherTranscript = true;
                   }
                 }
               }
             }

             // Incoming audio or text model turns
             if (content.modelTurn && content.modelTurn.parts) {
               for (const part of content.modelTurn.parts) {
                 if (part.inlineData && part.inlineData.data) {
                   const pcm16 = this.base64ToInt16(part.inlineData.data);
                   this.callbacks.onAudioData(pcm16, 24000); // SDK returns 24kHz
                 }
                 // Deliver model turn text if it contains chalkboard bracket tags or if no audio transcript was emitted
                 if (part.text) {
                   const cleaned = this.extractAndExecuteEmbeddedToolCalls(part.text);
                   if (cleaned && (part.text.includes("[") || part.text.includes("write_chalkboard") || !hasTeacherTranscript)) {
                     this.callbacks.onTranscript(cleaned, "teacher");
                   }
                 }
                 if (part.functionCall) {
                   this.handleSingleToolCall(part.functionCall.name, part.functionCall.args || {}, part.functionCall.id);
                   try {
                     this.session?.sendToolResponse({
                       functionResponses: [
                         {
                           id: part.functionCall.id,
                           name: part.functionCall.name,
                           response: { result: "ok" },
                         },
                       ],
                     });
                   } catch (e) {
                     console.warn(`[GeminiLive] Failed to send tool response for ${part.functionCall.name}:`, e);
                   }
                 }
               }
             }

             if (content.turnComplete) {
               this.callbacks.onTurnComplete();
             }
          },
          onerror: (err: any) => {
            if (!this.isManuallyClosed) {
              console.error("[GeminiLive] Connection error:", err);
              this.callbacks.onError(new Error(err.message || "Connection to Gemini Live was interrupted."));
            }
          },
          onclose: (event: any) => {
            this.isConnected = false;
            this.hasSentKickoff = false;
            if (!this.isManuallyClosed) {
               this.callbacks.onClose(event as CloseEvent);
            }
            this.session = null;
          }
        },
      });

      this.isConnected = true;
      console.log("[GeminiLive] Handshake verified and session ready.");
      this.callbacks.onSetupComplete();

      if (this.pendingKickoffText && !this.hasSentKickoff) {
        this.sendKickoff(this.pendingKickoffText);
      }
    } catch (err: any) {
      console.error("[GeminiLive] Connection error during setup:", err);
      this.callbacks.onError(new Error(`Connection failed: ${err.message}`));
    }
  }

  public sendKickoff(text: string): void {
    if (this.hasSentKickoff) {
      console.log("[GeminiLive] Kickoff already dispatched, ignoring repeat.");
      return;
    }
    if (!this.session) {
      console.log("[GeminiLive] Queued kickoff prompt while session connects.");
      this.pendingKickoffText = text;
      return;
    }
    try {
      console.log("[GeminiLive] Dispatching initial kickoff prompt to model:", text.slice(0, 100));
      this.hasSentKickoff = true;
      this.pendingKickoffText = null;
      // Send clientContent turn with turnComplete: true so model immediately begins spoken response
      this.session.sendClientContent({
        turns: [
          {
            role: "user",
            parts: [{ text }],
          },
        ],
        turnComplete: true,
      });
    } catch (err) {
      console.warn("[GeminiLive] Failed to send kickoff via sendClientContent, trying sendRealtimeInput fallback:", err);
      try {
        this.session.sendRealtimeInput({ text });
      } catch (fallbackErr) {
        console.warn("[GeminiLive] Failed to send kickoff fallback:", fallbackErr);
      }
    }
  }

  public sendTextMessage(text: string): void {
    if (!this.session || !text?.trim()) return;
    try {
      console.log("[GeminiLive] Dispatching text turn to model:", text.slice(0, 100));
      this.session.sendClientContent({
        turns: [
          {
            role: "user",
            parts: [{ text: text.trim() }],
          },
        ],
        turnComplete: true,
      });
    } catch (err) {
      console.warn("[GeminiLive] Failed to send text message via sendClientContent, trying sendRealtimeInput fallback:", err);
      try {
        this.session.sendRealtimeInput({ text: text.trim() });
      } catch (fallbackErr) {
        console.warn("[GeminiLive] Failed to send text fallback:", fallbackErr);
      }
    }
  }

  public sendAudioChunk(base64Chunk: string): void {
    if (!this.session) return;
    try {
      this.session.sendRealtimeInput({
        audio: {
          mimeType: "audio/pcm;rate=16000",
          data: base64Chunk,
        }
      });
    } catch (err) {
      console.warn("Failed to send audio chunk", err);
    }
  }

  public sendAudioStreamEnd(): void {
    if (!this.session) return;
    try {
      this.session.sendRealtimeInput({ audioStreamEnd: true });
    } catch (err) {
      console.warn("Failed to send audioStreamEnd", err);
    }
  }

  public sendTurnComplete(): void {
    if (!this.session) return;
    try {
      this.session.sendClientContent({ turnComplete: true });
    } catch (err) {
      console.warn("Failed to send turnComplete", err);
    }
  }

  public sendBoardContext(summaryText: string): void {
    // Disabled sending realtimeInput with board summary to prevent infinite feedback loops
    // Board curriculum context is already provided via initial systemInstruction.
    return;
  }

  private base64ToInt16(base64: string): Int16Array {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Int16Array(bytes.buffer);
  }

  public disconnect(): void {
    this.isManuallyClosed = true;
    this.isConnected = false;
    this.hasSentKickoff = false;
    this.pendingKickoffText = null;
    if (this.session) {
      try {
        this.session.close();
      } catch (err) {}
      this.session = null;
    }
  }
}
