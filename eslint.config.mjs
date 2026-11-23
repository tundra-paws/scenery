// eslint.config.mjs
import config from '@tuomashatakka/eslint-config'


/**
 * The determinism rules, as lint rather than prose.
 *
 * A capture is only comparable to yesterday's if the world is a function of the
 * seed and the tick count. Each of these is a way to make it a function of the
 * wall clock or of the order things happened to run in instead, and every one of
 * them compiles, runs, and looks fine on the machine it was written on.
 */
const DETERMINISM = [
  {
    selector: "MemberExpression[object.name='Math'][property.name='random']",
    message:  'the world is deterministic: draw from ctx.rng.fork(name) instead, so adding one feature does not reshuffle every feature built after it',
  },
  {
    selector: "MemberExpression[object.name='Date'][property.name='now']",
    message:  'wall time makes a capture irreproducible: take time from the frame (frame.frame * STEP)',
  },
  {
    selector: "NewExpression[callee.name='Date']",
    message:  'wall time makes a capture irreproducible: take time from the frame (frame.frame * STEP)',
  },
  {
    selector: "MemberExpression[object.name='performance'][property.name='now']",
    message:  'wall time makes a capture irreproducible: take time from the frame (frame.frame * STEP)',
  },
  {
    selector: "Identifier[name='requestAnimationFrame']",
    message:  'createApp owns the only render loop: animate in a module update hook rather than starting a second one',
  },
  {
    selector: 'CallExpression[callee.name=/^set(Timeout|Interval)$/]',
    message:  'timers run on wall time: count sim steps in a module update hook instead',
  },
  {
    selector: "MemberExpression[property.name='loop'][object.name='ctx']",
    message:  'ctx.loop runs on raw frame deltas, outside the fixed clock: animate in a module update hook instead',
  },
  {
    selector: 'CallExpression[callee.name=/^create(Fps|Rails|Orbit|Tpp|Iso)Scaffold$/]',
    message:  'the library scaffolds build their own app and loop, so they cannot be stepped or captured: write a module for the rig in src/rig instead',
  },
]

export default [
  {
    // `.scenery/` holds captured stills, diffs and the worktree `diff` builds a
    // reference in; `.site/` is the locally assembled preview of the published
    // site. Both are generated output.
    ignores: [ 'dist/**', '.scenery/**', '.site/**' ],
  },
  ...config,
  {
    files:   [ 'src/world/**/*.ts', 'src/rig/**/*.ts' ],
    ignores: [ 'src/**/*.test.ts' ],
    rules:   { 'no-restricted-syntax': [ 'error', ...DETERMINISM ]},
  },
  {
    // The shell is a static page with no build step, so its modules are plain
    // browser JavaScript rather than TypeScript.
    files:           [ 'shell/**/*.js' ],
    languageOptions: { sourceType: 'module' },
  },
]
