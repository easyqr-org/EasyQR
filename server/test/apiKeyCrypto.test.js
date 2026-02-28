const test = require("node:test");
const assert = require("node:assert/strict");

const {
  generateApiKey,
  hashApiKey,
  constantTimeEqual,
  verifyApiKey,
} = require("../src/security/apiKeyCrypto");

test("generateApiKey returns 32+ byte random key", () => {
  const key = generateApiKey();
  assert.equal(typeof key, "string");
  assert.ok(key.length >= 64);
});

test("hashApiKey is deterministic and not equal to raw key", () => {
  const raw = "my-secret-key";
  const hashA = hashApiKey(raw);
  const hashB = hashApiKey(raw);

  assert.equal(hashA, hashB);
  assert.notEqual(hashA, raw);
  assert.equal(hashA.length, 64);
});

test("constantTimeEqual returns true only for exact match", () => {
  assert.equal(constantTimeEqual("abc", "abc"), true);
  assert.equal(constantTimeEqual("abc", "abd"), false);
  assert.equal(constantTimeEqual("abc", "ab"), false);
});

test("verifyApiKey validates raw key against stored hash", () => {
  const raw = "rotate-key-1";
  const hash = hashApiKey(raw);
  assert.equal(verifyApiKey(raw, hash), true);
  assert.equal(verifyApiKey("wrong", hash), false);
});
