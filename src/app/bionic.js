const FIXATION_POINTS = [
    [0, 4, 12, 17, 24, 29, 35, 42, 48],
    [1, 2, 7, 10, 13, 14, 19, 22, 25, 28, 31, 34, 37, 40, 43, 46, 49],
    [1, 2, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41, 43, 45, 47, 49],
    [0, 2, 4, 5, 6, 8, 9, 11, 14, 15, 17, 18, 20, 0, 21, 23, 24, 26, 27, 29, 30, 32, 33, 35, 36, 38, 39, 41, 42, 44, 45, 47, 48],
    [0, 2, 3, 5, 6, 7, 8, 10, 11, 12, 14, 15, 17, 19, 20, 21, 23, 24, 25, 26, 28, 29, 30, 32, 33, 34, 35, 37, 38, 39, 41, 42, 43, 44, 46, 47, 48]
]

function getWordFixationLength(word, fixationSize) {
    const wordSize = word.length,
        points = FIXATION_POINTS[fixationSize]

    for (let i = 0; i < points.length; i++)
        if (wordSize <= points[i]) return i
}

function bionicConvert(str, fixationLength = 3, sep = ['<b>', '</b>'], ) {
    const matches = str.matchAll(/\p{L}(\p{L}|\p{Nd})*/ug)
    let result = ""
    let prev = 0

    for (const match of matches) {
        const start = match.index,
            end = start + match[0].length - getWordFixationLength(match[0], fixationLength - 1)
        result += str.slice(prev, start) + ((start != end) ? (sep[0] + str.slice(start, end) + sep[1]) : "")
        prev = end
    }
    return result + str.slice(prev, str.length)
}

export default bionicConvert;
