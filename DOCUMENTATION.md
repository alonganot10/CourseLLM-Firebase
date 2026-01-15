# Documentation Index

Welcome to the CourseLLM documentation. This index provides a complete overview of all available documentation and guides.

---

## Getting Started

Start here if you're new to the project:

1. **[README.md](./README.md)** - Project overview, quick start, and installation
2. **[docs/Architecture.md](./docs/Architecture.md)** - System architecture and component overview

---

## Core Documentation

### Technical Documentation

| Document | Description | Audience |
|----------|-------------|----------|
| [docs/Architecture.md](./docs/Architecture.md) | Complete system architecture, data flows, component interactions | Developers, Architects |
| [docs/API.md](./docs/API.md) | Comprehensive API reference for all services | Frontend Devs, Backend Devs, Integrators |
| [docs/DataConnect.md](./docs/DataConnect.md) | Firebase DataConnect setup, schema, and usage | Full-Stack Devs |


### Authentication & Authorization

| Document | Description | Audience |
|----------|-------------|----------|
| [docs/Auth/auth-implementation.md](./docs/Auth/auth-implementation.md) | Authentication implementation details and flows | Full-Stack Devs |
| [docs/Auth/Authentication PRD.md](./docs/Auth/Authentication PRD.md) | Authentication product requirements and acceptance criteria | Product Managers, Developers |

### Service-Specific Documentation

| Document | Description | Audience |
|----------|-------------|----------|
| [search-service/README.md](./search-service/README.md) | Search Service setup, API, testing, and deployment | Backend Devs, DevOps |

### Product Requirements

| Document | Description | Audience |
|----------|-------------|----------|
| [PRD/PRD.md](./PRD/PRD.md) | Main product requirements document | Product Managers, Stakeholders |
| [PRD/UserStories.md](./PRD/UserStories.md) | User stories and scenarios | Product Managers, UX Designers |
| [PRD/AcceptanceCriteria.md](./PRD/AcceptanceCriteria.md) | Acceptance criteria for features | QA Engineers, Developers |
| [PRD/DataModel.md](./PRD/DataModel.md) | Data model and schema definitions | Backend Devs, Architects |
| [PRD/Glossary.md](./PRD/Glossary.md) | Project terminology and definitions | All Team Members |

### Development Guidelines

| Document | Description | Audience |
|----------|-------------|----------|
| [openspec/AGENTS.md](./openspec/AGENTS.md) | OpenSpec workflow for AI-assisted development | AI Agents, Developers |
| [openspec/project.md](./openspec/project.md) | Project conventions and patterns | All Developers |
| [AGENTS.md](./AGENTS.md) | AI agent instructions (managed by OpenSpec) | AI Agents |
| [CLINE.md](./CLINE.md) | AI agent instructions (managed by OpenSpec) | AI Agents |

---

## Quick Reference by Role

### For New Developers

**Start Here:**
1. [README.md](./README.md) - Setup and installation
2. [docs/Architecture.md](./docs/Architecture.md) - Understand the system
3. [openspec/project.md](./openspec/project.md) - Learn project conventions
4. [docs/API.md](./docs/API.md) - API reference

**Then Explore:**
- Your specific service documentation (Frontend, Search Service, etc.)
- Authentication implementation if working on auth features
- DataConnect guide if working with database

### For Frontend Developers

**Essential:**
1. [README.md](./README.md) - Project setup
2. [docs/Architecture.md](./docs/Architecture.md) - System overview
3. [docs/Design-Guidelines.md](./docs/Design-Guidelines.md) - UI/UX guidelines
4. [docs/API.md](./docs/API.md) - API endpoints to call
5. [docs/Auth/auth-implementation.md](./docs/Auth/auth-implementation.md) - Auth integration

**Optional:**
- [docs/DataConnect.md](./docs/DataConnect.md) - If using GraphQL queries
- [PRD/UserStories.md](./PRD/UserStories.md) - Understand user requirements

### For Backend Developers

**Essential:**
1. [README.md](./README.md) - Project setup
2. [docs/Architecture.md](./docs/Architecture.md) - System architecture
3. [docs/API.md](./docs/API.md) - API specifications
4. [search-service/README.md](./search-service/README.md) - If working on search
5. [docs/DataConnect.md](./docs/DataConnect.md) - Database layer

**Optional:**
- [docs/Auth/auth-implementation.md](./docs/Auth/auth-implementation.md) - Auth middleware
- [PRD/DataModel.md](./PRD/DataModel.md) - Data model reference

### For DevOps Engineers

**Essential:**
1. [README.md](./README.md) - Project overview
2. [docs/Architecture.md](./docs/Architecture.md) - Deployment architecture
3. [search-service/README.md](./search-service/README.md) - Service deployment

**Focus Areas:**
- Monitoring and health checks (Architecture doc)
- Firebase configuration and setup
- Cloud Run deployment (Search Service)
- Environment variables and secrets

### For Product Managers

**Essential:**
1. [README.md](./README.md) - Project overview
2. [PRD/PRD.md](./PRD/PRD.md) - Product requirements
3. [PRD/UserStories.md](./PRD/UserStories.md) - User stories
4. [PRD/AcceptanceCriteria.md](./PRD/AcceptanceCriteria.md) - Feature acceptance

**Optional:**
- [docs/Architecture.md](./docs/Architecture.md) - Technical capabilities
- [docs/Design-Guidelines.md](./docs/Design-Guidelines.md) - UX approach

### For QA Engineers

**Essential:**
1. [README.md](./README.md) - Setup test environment
2. [PRD/AcceptanceCriteria.md](./PRD/AcceptanceCriteria.md) - Test criteria
3. [docs/API.md](./docs/API.md) - API testing reference
4. [docs/Auth/auth-implementation.md](./docs/Auth/auth-implementation.md) - Auth testing

**Testing Guides:**
- [search-service/README.md](./search-service/README.md) - Search service testing
- E2E test examples in `tests/` directory

### For Designers

**Essential:**
1. [docs/Design-Guidelines.md](./docs/Design-Guidelines.md) - Design system
2. [PRD/UserStories.md](./PRD/UserStories.md) - User requirements
3. [README.md](./README.md) - Tech stack overview

**Reference:**
- Component library: Radix UI + Shadcn/UI
- Icon library: Lucide React
- CSS framework: Tailwind CSS

---

## Documentation by Topic

### Authentication & Security

- [docs/Auth/auth-implementation.md](./docs/Auth/auth-implementation.md) - Implementation details
- [docs/Auth/Authentication PRD.md](./docs/Auth/Authentication PRD.md) - Requirements
- [docs/Architecture.md](./docs/Architecture.md#authentication-flow) - Auth architecture
- [docs/API.md](./docs/API.md#authentication) - API authentication

### Search & Indexing

- [search-service/README.md](./search-service/README.md) - Search service documentation
- [docs/API.md](./docs/API.md#search-service-api) - Search API reference
- [docs/Architecture.md](./docs/Architecture.md#search-integration) - Search architecture
- [PRD/PRD.md](./PRD/PRD.md) - Search requirements

### Data & Database

- [docs/DataConnect.md](./docs/DataConnect.md) - DataConnect guide
- [PRD/DataModel.md](./PRD/DataModel.md) - Data models
- [docs/Architecture.md](./docs/Architecture.md#firestore-database) - Database architecture

### AI & Machine Learning

- [docs/Architecture.md](./docs/Architecture.md#ai-layer-google-genkit) - AI architecture
- [docs/API.md](./docs/API.md#genkit-ai-flows) - AI flow API
- [PRD/PRD.md](./PRD/PRD.md) - AI feature requirements

### UI & Design

- [docs/Design-Guidelines.md](./docs/Design-Guidelines.md) - Complete design guide
- [docs/Architecture.md](./docs/Architecture.md#frontend-application-nextjs) - Frontend architecture
- Component usage examples in `src/components/`

### Testing

- [search-service/README.md](./search-service/README.md#testing) - Service testing
- [docs/Auth/auth-implementation.md](./docs/Auth/auth-implementation.md#test-helpers--playwright) - Auth testing
- [docs/Architecture.md](./docs/Architecture.md#testing-architecture) - Test strategy

### Deployment

- [README.md](./README.md#deployment) - Deployment overview
- [search-service/README.md](./search-service/README.md#deployment) - Service deployment
- [docs/Architecture.md](./docs/Architecture.md#deployment-architecture) - Architecture details

---

## Maintenance

### Keeping Documentation Updated

**When to Update Documentation:**
- After implementing new features
- When changing APIs or data models
- After architectural changes
- When updating dependencies with breaking changes

**Who Updates What:**
- **Developers**: Update technical docs as you code
- **Product Managers**: Update PRD when requirements change
- **Designers**: Update design guidelines for new patterns
- **DevOps**: Update deployment docs for infrastructure changes

**Documentation Review:**
- Review docs during code reviews
- Quarterly documentation audit
- User feedback on doc clarity

---

## Contributing to Documentation

### Style Guide

- Use clear, concise language
- Include code examples for technical docs
- Add diagrams for complex concepts
- Keep formatting consistent
- Update table of contents when adding sections

### Documentation Standards

- **Markdown format**: All docs use Markdown (.md)
- **Code blocks**: Use proper syntax highlighting
- **Links**: Use relative links for internal docs
- **Headers**: Use hierarchical header structure (# → ## → ###)
- **Lists**: Use bullet points for items, numbered lists for steps

### Template for New Documents

```markdown
# Document Title

## Overview

Brief description of what this document covers.

---

## [Section 1]

Content here...

## [Section 2]

Content here...

---

## Related Documentation

- Link to related doc 1
- Link to related doc 2

---

**Last Updated**: YYYY-MM-DD  
**Version**: X.X  
**Maintainer**: Team/Person Name
```

---

## Feedback & Support

### Questions or Issues with Documentation?

1. Check if the answer exists in another doc (use Ctrl+F)
2. Check related documentation (see links at bottom of docs)
3. Ask in team chat or create an issue
4. Suggest improvements via pull request

### Documentation Requests

If you need documentation on a topic that doesn't exist:
1. Create an issue with "Documentation" label
2. Describe what information is needed
3. Tag relevant team members

---

## Document Versions

| Document | Version | Last Updated |
|----------|---------|--------------|
| README.md | 2.0 | 2026-01-15 |
| docs/Architecture.md | 1.0 | 2026-01-15 |
| docs/API.md | 1.0 | 2026-01-15 |
| docs/DataConnect.md | 1.0 | 2026-01-15 |
| docs/Design-Guidelines.md | 1.0 | 2026-01-15 |
| search-service/README.md | 1.0 | 2026-01-15 |
| docs/Auth/auth-implementation.md | 1.0 | (existing) |
| docs/Auth/Authentication PRD.md | 1.0 | (existing) |

---

**Last Updated**: 2026-01-15  
**Maintainer**: CourseLLM Development Team
