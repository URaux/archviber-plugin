---
name: arch-patterns
description: Architecture patterns and best practices for system design. Auto-triggered when analyzing or creating architecture diagrams.
user-invocable: false
---

# Architecture Patterns Reference

Use this knowledge when recommending, analyzing, or generating architecture diagrams. Each pattern includes when to recommend it and its key trade-offs.

---

## Microservices

**When to use**: Team is large enough that separate deployments reduce coordination cost; different services need independent scaling or technology choices; domain boundaries are clear.

**Key trade-offs**: Operational overhead (service discovery, distributed tracing, deploy pipelines); network latency replaces in-process calls; data consistency becomes eventual; start with a monolith and extract only when the pain is real.

**ArchViber mapping**: Each service = one container (color by domain); shared infrastructure (gateway, bus) = separate containers.

---

## Event-Driven / Message Queue

**When to use**: Producers and consumers need temporal decoupling; high write throughput that downstream cannot absorb synchronously; audit trail of every state change is valuable.

**Key trade-offs**: Harder to reason about ordering and idempotency; debugging requires distributed tracing; adds a new failure domain (the broker). Use `async` edges in the diagram with the queue name as the label.

**Common brokers**: Kafka (high throughput, replay), RabbitMQ (routing flexibility), Redis Streams (lightweight), SQS (managed, at-least-once).

---

## API Gateway

**When to use**: Multiple clients (web, mobile, partners) hit different backend services; cross-cutting concerns (auth, rate-limiting, TLS termination, logging) should not be duplicated in every service.

**Key trade-offs**: Single point of failure if not load-balanced; can become a bottleneck or a dumping ground for business logic. Keep it thin — routing and policy only, no domain logic.

**ArchViber mapping**: One block in a `slate` or `green` container, with `sync` edges fanning out to downstream services.

---

## BFF (Backend for Frontend)

**When to use**: Web and mobile clients need different data shapes from the same backend; client teams want autonomy over their own API layer without coordinating every change with backend teams.

**Key trade-offs**: Duplicates some backend logic across BFFs; adds a network hop; requires the client team to own the BFF codebase. Most valuable when clients diverge significantly in payload needs.

**ArchViber mapping**: Separate `green` container per client type (web-bff, mobile-bff), each with `sync` edges to shared core services.

---

## CQRS / Event Sourcing

**When to use**: Read and write load profiles differ dramatically; you need a full audit log of mutations; multiple read models must be derived from the same data (reporting, search, analytics).

**Key trade-offs**: Significant complexity — two models to maintain, eventual consistency, projection rebuild time. Event Sourcing amplifies all CQRS concerns. Use CQRS without Event Sourcing first; add ES only when replay or audit is a hard requirement.

**ArchViber mapping**: Separate write-side (command) and read-side (query) blocks; event store as a block in the `amber` container; `async` edges from command side to projections.

---

## Sidecar / Service Mesh

**When to use**: Cross-cutting concerns (mTLS, retries, circuit-breaking, telemetry) need to be applied uniformly across many services without modifying application code; ops team owns the policy, dev team owns the business logic.

**Key trade-offs**: Adds per-pod overhead (CPU, memory); control plane is another failure domain; steeper learning curve. Only justified at scale (10+ services or strict compliance requirements).

**ArchViber mapping**: Sidecar proxies typically stay implicit (not modeled as blocks); add a `slate` container for the control plane (Istio/Linkerd) if it needs explicit representation.

---

## Strangler Fig (Migration Pattern)

**When to use**: Migrating a legacy monolith to a new architecture; you need to ship continuously without a big-bang rewrite; risk must be contained to one feature at a time.

**Key trade-offs**: Requires a routing layer (facade) in front of both old and new systems; the facade itself becomes a dependency; migration can stall if not actively driven. Plan explicit cutover milestones.

**ArchViber mapping**: Legacy system in a `rose` container (external/legacy); new services in their own containers; facade/proxy block in `slate` routing traffic; `sync` edges show current traffic split. Update block statuses as migration progresses.

---

## Checklist: Common Missing Components

When reviewing a diagram, flag if these are absent and the system is non-trivial:

- **Auth / Identity** — AuthN/AuthZ service or provider (OAuth, JWT issuer)
- **API Gateway** — if multiple clients or services are present
- **Logging / Observability** — log aggregator, tracing backend (Jaeger, Datadog, etc.)
- **Cache** — Redis/Memcached layer for hot read paths
- **CDN / Static Assets** — for web frontends with global traffic
- **Message Broker** — if async communication is implied but no queue is modeled
- **CI/CD** — if the diagram includes infrastructure concerns
- **Secret Management** — Vault, AWS Secrets Manager, etc.
