import { resolveSceneType, parseSceneParams } from '../components/whiteboard/scenes/sceneRegistry'
import { evaluateMathExpression } from '../lib/mathEvaluator'
import { createClient } from '@supabase/supabase-js'

async function runVerification() {
  console.log('=== MATH, GRAPH & SCENE VERIFICATION SUITE ===')
  let passed = 0
  let failed = 0

  function assert(name: string, condition: boolean, detail?: any) {
    if (condition) {
      console.log(`[PASS] ${name}`)
      passed++
    } else {
      console.error(`[FAIL] ${name}`, detail || '')
      failed++
    }
  }

  // 1. Math Evaluator Tests
  const linear = evaluateMathExpression('2x + 1', 3)
  assert('Linear evaluation (2x + 1 at x=3 == 7)', linear === 7, { got: linear })

  const quad = evaluateMathExpression('x^2 - 4', 3)
  assert('Quadratic evaluation (x^2 - 4 at x=3 == 5)', quad === 5, { got: quad })

  const quadParen = evaluateMathExpression('(x + 1)^2', 3)
  assert('Parenthesized power ((x + 1)^2 at x=3 == 16)', quadParen === 16, { got: quadParen })

  const unaryMinusPower = evaluateMathExpression('-x^2 + 4', 2)
  assert('Unary minus before power (-x^2 + 4 at x=2 == 0)', unaryMinusPower === 0, { got: unaryMinusPower })

  const unaryParenPower = evaluateMathExpression('-(x + 1)^2', 2)
  assert('Unary minus on parenthesized power (-(x+1)^2 at x=2 == -9)', unaryParenPower === -9, { got: unaryParenPower })

  const naturalLog = evaluateMathExpression('ln(x)', Math.E)
  assert('Natural Logarithm (ln(e) == 1)', Math.abs((naturalLog || 0) - 1) < 1e-9, { got: naturalLog })

  const base10Log = evaluateMathExpression('log(x)', 100)
  assert('Base 10 Logarithm (log(100) == 2)', Math.abs((base10Log || 0) - 2) < 1e-9, { got: base10Log })

  const expDecay = evaluateMathExpression('10 * e^(-0.6x)', 1)
  assert('Exponential Decay (10 * e^(-0.6) around 5.488)', typeof expDecay === 'number' && Math.abs(expDecay - 5.4881) < 0.01, { got: expDecay })

  const expDirect = evaluateMathExpression('exp(x)', 1)
  assert('Direct Exponential exp(1) == e', typeof expDirect === 'number' && Math.abs(expDirect - Math.E) < 1e-9, { got: expDirect })

  // Factored polynomial multiplication: x(x - 2)
  const factoredQuad = evaluateMathExpression('x(x - 2)', 4)
  assert('Factored polynomial x(x - 2) at x=4 == 8', factoredQuad === 8, { got: factoredQuad })

  const factoredLead = evaluateMathExpression('3x(x - 1)', 3)
  assert('Factored polynomial with coefficient 3x(x - 1) at x=3 == 18', factoredLead === 18, { got: factoredLead })

  const trigSin = evaluateMathExpression('2 * sin(x)', Math.PI / 2)
  assert('Trigonometric sine (2 * sin(pi/2) == 2)', Math.abs((trigSin || 0) - 2) < 1e-9, { got: trigSin })

  const trigTan = evaluateMathExpression('tan(x)', 0)
  assert('Trigonometric tangent (tan(0) == 0)', trigTan === 0, { got: trigTan })

  const rational = evaluateMathExpression('20 / x', 5)
  assert('Rational function (20 / x at x=5 == 4)', rational === 4, { got: rational })

  const sqrtVal = evaluateMathExpression('sqrt(x)', 16)
  assert('Square root (sqrt(16) == 4)', sqrtVal === 4, { got: sqrtVal })

  const absVal = evaluateMathExpression('abs(-5x)', 2)
  assert('Absolute value (abs(-5x) at x=2 == 10)', absVal === 10, { got: absVal })

  // 2. Scene Aliases
  const aliasTests = [
    { input: 'circuits', expected: 'circuits_interactive' },
    { input: 'forces', expected: 'physics_forces' },
    { input: 'optics', expected: 'optics_refraction' },
    { input: 'waves', expected: 'wave_harmonics' },
    { input: 'matter', expected: 'states_of_matter' },
    { input: 'linear_graph', expected: 'linear_graphs' },
    { input: '3d_vectors', expected: 'coordinate_geometry' },
    { input: 'geometry', expected: 'geometry_3d' },
    { input: 'cross_section', expected: 'geometry_cross_section' },
    { input: 'bohr_atom', expected: 'bohr_atom' },
  ]
  aliasTests.forEach(({ input, expected }) => {
    const resolved = resolveSceneType(input)
    assert(`Scene alias "${input}" -> "${expected}"`, resolved === expected, { got: resolved })
  })

  // 3. Scene Parameter Parsing
  const kvParams = parseSceneParams('shape=cylinder, radius=3, height=8')
  assert('Key-value comma params parsing', kvParams.shape === 'cylinder' && kvParams.radius === 3 && kvParams.height === 8, kvParams)

  const pipeParams = parseSceneParams('voltage=24 | circuitType=parallel')
  assert('Key-value pipe params parsing', pipeParams.voltage === 24 && pipeParams.circuitType === 'parallel', pipeParams)

  const jsonParams = parseSceneParams('{"shape": "cone", "radius": 4, "height": 10}')
  assert('JSON params parsing', jsonParams.shape === 'cone' && jsonParams.radius === 4 && jsonParams.height === 10, jsonParams)

  const flagParams = parseSceneParams('shape=cylinder, wireframe')
  assert('Standalone boolean flag parsing (wireframe=true)', flagParams.shape === 'cylinder' && flagParams.wireframe === true, flagParams)

  // 4. Supabase Worked Examples Seeding Check
  const supabaseUrl = 'https://fdhxtsleoejoincdacyq.supabase.co'
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkaHh0c2xlb2Vqb2luY2RhY3lxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyOTQ4NzUsImV4cCI6MjEwNjg3MDg3NX0.s8SARLbWj065H9_5ww3cr2kfUNlP9uySYzovRPTlguc'
  const client = createClient(supabaseUrl, supabaseKey)

  const { data: seededModules, error: dbErr } = await client
    .from('syllabus_modules')
    .select('id, title, worked_examples')
    .in('id', [
      'bf175a67-6cf6-43f2-b6cc-1e061fa52d03',
      'c8f0d8c2-1382-4d18-a324-777e023ffbd3',
      '11070fae-71a9-4c45-a32d-4d12ab551c40',
      '1e76898d-423e-4a24-b129-121d6ce26ddc'
    ])

  assert('Supabase database accessible', !dbErr, dbErr?.message)
  if (seededModules) {
    for (const m of seededModules) {
      const count = Array.isArray(m.worked_examples) ? m.worked_examples.length : 0
      assert(`Module "${m.title}" has >= 1 worked example`, count >= 1, { count })
      if (count > 0) {
        const ex = m.worked_examples[0]
        const hasAllFields = Boolean(ex.problem && ex.given && ex.formula && ex.substitution && ex.calculation && ex.finalAnswer)
        assert(`Exemplar in "${m.title}" has all 6 topper fields`, hasAllFields, ex)
      }
    }
  }

  console.log(`\nOVERALL: ${passed} PASSED, ${failed} FAILED`)
  if (failed > 0) {
    process.exit(1)
  }
}

runVerification()
