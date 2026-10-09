# Security Specification

## Data Invariants
1. Users can only read their own profile.
2. Users can only modify their own profile.
3. Friends list can only be read/modified by the user.
4. Settings can only be read/modified by the user.

## The Dirty Dozen Payloads
1. Create user with invalid username (too long).
2. Update user currency to a string.
3. Access another user's profile.
4. Update another user's settings.
5. Create a friend with invalid ID.
6. Create friend for another user.
7. List friends of another user.
8. Delete friend from another user.
9. Create settings with invalid quality (e.g., "ultra").
10. Update settings volume to > 100.
11. Update settings with ghost field.
12. Create settings for another user.

## Test Runner (firestore.rules.test.ts)
(To be implemented when testing environment is available).
