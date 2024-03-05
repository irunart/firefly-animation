const convertHexToRgb = (hex) => {
    const value = parseInt(hex, 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

export const hexToRgb = (hex) => {
    console.log(hex);
    if (!hex) {
        return;
    }
    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
    }
    if (hex.length !== 6) {
        return;
    }
    return convertHexToRgb(hex)
}