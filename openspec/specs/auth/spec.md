# Authentication & Onboarding Spec

## Requirements

### Requirement: Google Sign-In
Users SHALL be able to sign in using their Google account.

#### Scenario: Successful Google Sign-In
- **WHEN** user clicks "Sign in with Google" on the login page
- **THEN** they are redirected to Google OAuth
- **AND** upon return, they are signed in and redirected to their dashboard

### Requirement: Email/Password Authentication
Users SHALL be able to sign in or sign up using an email and password.

#### Scenario: New User Sign Up
- **WHEN** user enters a valid email and password and clicks "Sign up"
- **THEN** a new account is created
- **AND** they are redirected to the onboarding flow

#### Scenario: Existing User Sign In
- **WHEN** user enters valid credentials and clicks "Sign in"
- **THEN** they are authenticated and redirected to their dashboard

### Requirement: User Onboarding
First-time users SHALL complete a profile setup to define their role and preferences.

#### Scenario: Profile Completion
- **WHEN** a user logs in for the first time
- **THEN** they are redirected to `/onboarding`
- **AND** they must select a Role (Student/Teacher), Department, and Courses before proceeding

### Requirement: Role-Based Access Control
Users SHALL only access pages appropriate for their selected role.

#### Scenario: Student accessing Teacher pages
- **WHEN** a user with "student" role attempts to visit `/teacher`
- **THEN** they are automatically redirected to `/student`

#### Scenario: Unauthenticated access
- **WHEN** a guest user attempts to visit protected routes
- **THEN** they are redirected to `/login`
