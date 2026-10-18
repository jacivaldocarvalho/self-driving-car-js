import js from '@eslint/js';

const scriptExports = {
    car: ['Car'],
    controls: ['Controls'],
    network: ['NeuralNetwork'],
    random: ['createSeededRandom'],
    evolution: ['Evolution'],
    road: ['Road'],
    sensor: ['Sensor'],
    visualizer: ['Visualizer'],
    utils: ['lerp', 'getIntersection', 'polysIntersection', 'getRGBA'],
    main: []
};
const sharedNames = Object.values(scriptExports).flat();

export default [
    { ignores: ['node_modules/**', 'coverage/**'] },
    js.configs.recommended,
    {
        files: ['assets/js/*.js'],
        languageOptions: {
            sourceType: 'script',
            globals: {
                document: 'readonly',
                window: 'readonly',
                localStorage: 'readonly',
                requestAnimationFrame: 'readonly',
                console: 'readonly'
            }
        },
        rules: {
            // Classic scripts expose top-level declarations to other scripts and HTML.
            'no-unused-vars': ['error', { vars: 'local' }]
        }
    },
    // Only names provided by other files are globals in each classic script.
    ...Object.entries(scriptExports).map(([file, ownNames]) => ({
        files: [`assets/js/${file}.js`],
        languageOptions: {
            globals: Object.fromEntries(sharedNames
                .filter(name => !ownNames.includes(name))
                .map(name => [name, 'readonly']))
        }
    })),
    {
        files: ['tests/**/*.cjs', 'scripts/**/*.cjs'],
        languageOptions: {
            sourceType: 'commonjs',
            globals: { __dirname: 'readonly', process: 'readonly', console: 'readonly' }
        }
    }
];
