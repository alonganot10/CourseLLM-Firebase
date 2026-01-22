# Search Spec

## Requirements

### Requirement: Semantic Search
Users SHALL be able to search across course materials using natural language queries.

#### Scenario: Performing a search
- **WHEN** a user enters a query in the search bar (e.g., "how does recursion work")
- **THEN** the system returns ranked results from lectures and assignments
- **AND** results display a snippet and relevance score

### Requirement: Search Filtering
Users SHALL be able to filter search results by context.

#### Scenario: Filtering by Course
- **WHEN** a user selects a specific "Course ID" filter
- **THEN** search results are narrowed to only materials from that course
