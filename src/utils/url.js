function normalizeUrl(input) {
    const trimmed = (input || "").trim();
    if (!trimmed) {
        return "kargo://home";
    }

    const isProtocolUrl = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed);
    const hasSpaces = trimmed.includes(" ");
    const looksLikeHost = /^(?:https?:\/\/)?(?:[\w-]+\.)+[\w-]{2,}(?:\/.*)?$/i.test(trimmed);

    if (trimmed.toLowerCase().startsWith("kargo://")) {
        return trimmed;
    }

    if (isProtocolUrl) {
        return trimmed;
    }
    if (!hasSpaces && looksLikeHost) {
        return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    }

    return `https://duckduckgo.com/?q=${encodeURIComponent(trimmed)}`;
}

function isKargoScheme(url) {
    return typeof url === "string" && url.toLowerCase().startsWith("kargo://");
}

window.normalizeUrl = normalizeUrl;
window.isKargoScheme = isKargoScheme;