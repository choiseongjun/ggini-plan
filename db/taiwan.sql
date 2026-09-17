-- Additive Taiwan market support; Korean/Toss data is not modified.
INSERT INTO currencies VALUES ('TWD',2) ON CONFLICT DO NOTHING;
INSERT INTO locales VALUES ('zh-TW','繁體中文（台灣）') ON CONFLICT DO NOTHING;
INSERT INTO markets VALUES ('TW','台灣','TWD','zh-TW','Asia/Taipei','active') ON CONFLICT DO NOTHING;
INSERT INTO market_locales VALUES ('TW','zh-TW') ON CONFLICT DO NOTHING;
INSERT INTO market_sellers VALUES ('TW','laurel','桂冠官方商城','https://www.laurel.com.tw') ON CONFLICT DO NOTHING;
