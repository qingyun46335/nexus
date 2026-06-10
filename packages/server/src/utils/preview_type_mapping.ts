export type previewTypeEnum = "text" | "image" | "video" | "audio" | "unsupported"

export const suffixIconMap: Record<string, previewTypeEnum> = {
    // ===== Web =====
    html: "text",
    htm: "text",
    css: "text",
    scss: "text",
    sass: "text",
    less: "text",
    js: "text",
    mjs: "text",
    cjs: "text",
    jsx: "text",
    ts: "text",
    mts: "text",
    cts: "text",
    tsx: "text",
    vue: "text",
    svelte: "text",
    astro: "text",
    php: "text",

    // ===== Backend =====
    java: "text",
    kt: "text",
    kts: "text",
    groovy: "text",
    scala: "text",
    py: "text",
    rb: "text",
    go: "text",
    rs: "text",
    c: "text",
    h: "text",
    cpp: "text",
    cc: "text",
    cxx: "text",
    hpp: "text",
    cs: "text",
    swift: "text",
    dart: "text",
    lua: "text",
    pl: "text",
    r: "text",
    sh: "text",
    bash: "text",
    zsh: "text",
    fish: "text",
    ps1: "text",

    // ===== Config =====
    json: "text",
    json5: "text",
    yaml: "text",
    yml: "text",
    toml: "text",
    ini: "text",
    env: "text",
    conf: "text",
    properties: "text",
    xml: "text",

    // ===== Database =====
    sql: "text",
    db: "unsupported",
    sqlite: "unsupported",

    // ===== Markdown / Docs =====
    md: "text",
    mdx: "text",
    txt: "text",
    pdf: "unsupported", // 默认浏览器无法直接当纯文本预览，归类为不可预览
    doc: "unsupported",
    docx: "unsupported",
    xls: "unsupported",
    xlsx: "unsupported",
    csv: "text",        // CSV 本质是逗号分隔的纯文本
    ppt: "unsupported",
    pptx: "unsupported",

    // ===== Image =====
    png: "image",
    jpg: "image",
    jpeg: "image",
    gif: "image",
    webp: "image",
    svg: "image",
    ico: "image",
    bmp: "image",
    jfif: "image",

    // ===== Audio =====
    mp3: "audio",
    wav: "audio",
    flac: "audio",
    ogg: "audio",

    // ===== Video =====
    mp4: "video",
    mov: "video",
    avi: "video",
    mkv: "video",
    webm: "video",

    // ===== Archive =====
    zip: "unsupported",
    rar: "unsupported",
    "7z": "unsupported",
    tar: "unsupported",
    gz: "unsupported",

    // ===== DevOps =====
    dockerfile: "text",
    dockerignore: "text",
    gitignore: "text",
    gitattributes: "text",
    gitmodules: "text",
    lock: "text",
    npmrc: "text",
    yarnrc: "text",
    pnpmfile: "text",

    // ===== Framework / Build =====
    gradle: "text",
    pom: "text",
    bat: "text",
    exe: "unsupported",
    apk: "unsupported",
    ipa: "unsupported",

    // ===== Cloudflare / Workers =====
    wrangler: "text",
};