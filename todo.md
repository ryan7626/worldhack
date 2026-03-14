# Memory Reliver — TODO

## 🔒 Security & Auth
- [ ] Integrate Supabase Auth (Google Sign-In / Email)
- [ ] Add `user_id` column to `photos` and `worlds` tables
- [ ] Write RLS policies so users can only access their own data
- [ ] Replace Service Role Key usage with Anon Key + user JWT
- [ ] Scope storage uploads to per-user folders (`memories/{user_id}/`)

## 🚀 Performance
- [ ] Cap pixel ratio to 1.5 for fullscreen 3D view
- [ ] Add WebXR support for Pico VR headset
- [ ] Implement dynamic resolution scaling based on frame rate
