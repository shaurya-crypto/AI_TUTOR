/**
 * Safe Cartesian Math Evaluator for dynamic whiteboard graphs (y = f(x))
 * Supports polynomials, quadratics, rational functions, trigonometry, exponentials, logarithms, and discrete coordinates.
 */
export function evaluateMathExpression(formulaStr: string, x: number): number | null {
  try {
    let expr = formulaStr
      .replace(/\s+/g, '')
      .replace(/^[yf]\s*\(?x?\)?\s*=\s*/i, '')

    // Handle e^expr -> Math.exp(expr)
    expr = expr.replace(/e\^(\([^\)]+\)|[a-zA-Z0-9\.\-]+)/gi, 'Math.exp($1)')

    // Replace implicit multiplication:
    // 2x -> 2*x, 2(x) -> 2*(x), (x)(y) -> (x)*(y), (x)2 -> (x)*2
    expr = expr.replace(/(\d+)([a-zA-Z\(])/g, '$1*$2')
    expr = expr.replace(/\)([a-zA-Z0-9\(])/g, ')*$1')
    // Variable multiplied by parenthesis: x(x - 2) -> x*(x - 2)
    expr = expr.replace(/x\(/gi, 'x*(')

    // Disambiguate unary minus before exponentiation in JS (e.g. -x^2 -> (0-1)*x^2, -(x+1)^2 -> (0-1)*(x+1)^2)
    expr = expr.replace(/^-/, '(0-1)*')
    expr = expr.replace(/\(-/g, '((0-1)*')
    expr = expr.replace(/([+*/,])-+/g, '$1(0-1)*')

    // Replace power operator ^ with native JavaScript **
    expr = expr.replace(/\^/g, '**')

    // Protect function names - avoid collision between ln and log
    expr = expr
      .replace(/sin\(/gi, 'Math.sin(')
      .replace(/cos\(/gi, 'Math.cos(')
      .replace(/tan\(/gi, 'Math.tan(')
      .replace(/sqrt\(/gi, 'Math.sqrt(')
      .replace(/abs\(/gi, 'Math.abs(')
      .replace(/ln\(/gi, '__LN_TEMP__(')
      .replace(/log10\(/gi, 'Math.log10(')
      .replace(/log\(/gi, 'Math.log10(')
      .replace(/__LN_TEMP__\(/g, 'Math.log(')
      .replace(/pi/gi, 'Math.PI')

    if (!/^[0-9x\+\-\*\/\.\(\)\,\sMathPIEepowsincoztasqrblg]+$/i.test(expr)) {
      return null
    }

    // Pass standard math functions into scope so both sin(x) and Math.sin(x), exp(x), ln(x), log(x) evaluate seamlessly
    const fn = new Function(
      'x',
      'Math',
      'e',
      'E',
      'exp',
      'ln',
      'log',
      'sin',
      'cos',
      'tan',
      'sqrt',
      'abs',
      `"use strict"; return (${expr});`
    )
    const val = fn(
      x,
      Math,
      Math.E,
      Math.E,
      Math.exp,
      Math.log,
      Math.log10,
      Math.sin,
      Math.cos,
      Math.tan,
      Math.sqrt,
      Math.abs
    )
    if (typeof val !== 'number' || isNaN(val) || !isFinite(val)) return null
    return val
  } catch {
    return null
  }
}
