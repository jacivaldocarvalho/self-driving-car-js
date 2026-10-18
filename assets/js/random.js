// SplitMix32 variant documented by bryc (public domain):
// https://github.com/bryc/code/blob/master/jshash/PRNGs.md#splitmix32
function createSeededRandom(seed) {
    if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
        throw new RangeError("Seed must be an integer from 0 to 4294967295.");
    }
    let state = seed >>> 0;
    return function random() {
        state = (state + 0x9e3779b9) >>> 0;
        let mixed = Math.imul(state ^ (state >>> 16), 0x21f0aaad);
        mixed = Math.imul(mixed ^ (mixed >>> 15), 0x735a2d97);
        return ((mixed ^ (mixed >>> 15)) >>> 0) / 4294967296;
    };
}
