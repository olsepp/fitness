# SvelteKit + Supabase Development Guidelines

## Authentication & Data Operations

1. **Server-Side Operations**
    - Keep all create/update/delete/toggle operations on the server side
    - Browser should only send form submissions or fetch requests to server handlers
    - Update UI from server responses
    - Optimistic UI updates are OK but must revert on error

2. **Server Session as Source of Truth**
    - Server session (cookie-based) is the source of truth for auth
    - Never rely on browser-side auth for write operations
    - Always use `locals.supabase` in server code

3. **Structured Responses**
    - Return consistent success/error payloads from all server handlers
    - Update local state from payloads instead of forcing full refreshes
    - Use shape: `{ success: boolean; data?: any; error?: string; }`

4. **UI Loading States**
    - Disable buttons during in-flight requests
    - Always clear loading flags in try-catch-finally
    - Avoid effect loops that reassign state on every render

5. **Server-Side Validation**
    - Validate all payloads on the server (required fields, ownership, ranges)
    - Never trust client-side validation alone
    - Check user ownership before all operations

6. **Form Handling**
    - Avoid nested form submissions
    - Avoid overlapping client handlers
    - Use distinct submit targets or separate forms

7. **Error Handling**
    - Log full errors server-side
    - Send user-safe error messages to client
    - Never expose sensitive data in client errors

8. **Production Configuration**
    - Keep auth config aligned with deployed domain
    - Verify site URL, redirect URLs, and environment keys
    - Ensure cookies are set on the correct domain

9. **Supabase Client Pattern**
    - Server code: Use `locals.supabase` (from hooks)
    - Client code: Use `supabase` from `$lib/supabaseClient`
    - API functions: Accept `SupabaseClient` as first parameter