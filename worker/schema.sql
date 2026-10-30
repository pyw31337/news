-- 개인정보 없이 '불투명 ID'만 저장: uid = HMAC(ID_SALT, 제공자:고유번호). 이메일·이름·사진은 받지도 저장하지도 않음
CREATE TABLE IF NOT EXISTS users (uid TEXT PRIMARY KEY, created INTEGER NOT NULL, last_seen INTEGER);
-- 하나의 NewsBoard 계정에 Google·Kakao·Naver 로그인을 안전하게 연결한다.
-- provider_subject는 제공자 고유번호를 HMAC으로 한 번 더 가린 값이며, 원문 식별값은 저장하지 않는다.
CREATE TABLE IF NOT EXISTS identities (
  provider TEXT NOT NULL,
  provider_subject TEXT NOT NULL,
  uid TEXT NOT NULL,
  created INTEGER NOT NULL,
  PRIMARY KEY (provider, provider_subject)
);
CREATE INDEX IF NOT EXISTS identities_uid ON identities(uid);
CREATE TABLE IF NOT EXISTS sessions (th TEXT PRIMARY KEY, uid TEXT NOT NULL, exp INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS sessions_uid ON sessions(uid);
CREATE TABLE IF NOT EXISTS docs (uid TEXT PRIMARY KEY, data TEXT NOT NULL, rev INTEGER NOT NULL DEFAULT 1, updated INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS push_subs (id TEXT PRIMARY KEY, uid TEXT, sub TEXT NOT NULL, topics TEXT, created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS oauth_state (st TEXT PRIMARY KEY, exp INTEGER NOT NULL);
