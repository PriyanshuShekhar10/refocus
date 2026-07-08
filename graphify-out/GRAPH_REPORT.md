# Graph Report - refocus  (2026-07-08)

## Corpus Check
- 324 files · ~134,679 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1601 nodes · 3815 edges · 108 communities (98 shown, 10 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d1418674`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 93|Community 93]]
- [[_COMMUNITY_Community 94|Community 94]]
- [[_COMMUNITY_Community 96|Community 96]]
- [[_COMMUNITY_Community 98|Community 98]]
- [[_COMMUNITY_Community 99|Community 99]]
- [[_COMMUNITY_Community 102|Community 102]]
- [[_COMMUNITY_Community 103|Community 103]]
- [[_COMMUNITY_Community 104|Community 104]]
- [[_COMMUNITY_Community 106|Community 106]]
- [[_COMMUNITY_Community 107|Community 107]]
- [[_COMMUNITY_Community 112|Community 112]]
- [[_COMMUNITY_Community 113|Community 113]]
- [[_COMMUNITY_Community 116|Community 116]]

## God Nodes (most connected - your core abstractions)
1. `getDb()` - 177 edges
2. `checkRateLimit()` - 67 edges
3. `requireVerifiedEmail()` - 66 edges
4. `rateLimitedResponse()` - 62 edges
5. `authOptions` - 58 edges
6. `publish()` - 39 edges
7. `resolveAvatarUrl()` - 33 edges
8. `requireAdmin()` - 29 edges
9. `publishAbly()` - 28 edges
10. `Avatar()` - 26 edges

## Surprising Connections (you probably didn't know these)
- `Matchmaking()` --calls--> `useEmailVerified()`  [EXTRACTED]
  app/(product)/components/Matchmaking.tsx → hooks/useEmailVerified.ts
- `BookSessionModal()` --calls--> `useCommunityModeration()`  [EXTRACTED]
  app/(product)/components/BookSessionModal.tsx → hooks/useCommunityModeration.ts
- `CommunityChat()` --calls--> `displayName()`  [INFERRED]
  app/(product)/components/Community/CommunityChat.tsx → lib/sessionReminders.ts
- `formatRemaining()` --calls--> `pad()`  [INFERRED]
  app/(product)/sessions/[id]/ClientCall.tsx → lib/utils.ts
- `GET()` --calls--> `areFriends()`  [EXTRACTED]
  app/api/chat/[friendId]/events/route.ts → lib/friendship.ts

## Communities (108 total, 10 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.19
Nodes (11): CalendarSidebarProps, DurationSelectorBaseProps, DurationSelectorProps, MultiSelectProps, SingleSelectProps, VARIANT_STYLES, UIState, DurationMin (+3 more)

### Community 1 - "Community 1"
Cohesion: 0.11
Nodes (19): UseCalendarSessionsOptions, UseCalendarSessionsReturn, addMinutes(), clamp(), formatHour(), minutesBetween(), pad(), a (+11 more)

### Community 2 - "Community 2"
Cohesion: 0.19
Nodes (9): PasswordStrengthMeter(), Props, STRENGTH_LABELS, ChangePasswordSection(), SignUpForm(), PasswordStrength, PasswordValidationResult, result (+1 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (25): metadata, siteUrl, metadata, openRoles, siteUrl, LandingLightLock(), ArrowIcon(), Faq() (+17 more)

### Community 4 - "Community 4"
Cohesion: 0.14
Nodes (21): AdminPage(), metadata, GET(), GET(), GET(), GET(), GET(), AdminContext (+13 more)

### Community 5 - "Community 5"
Cohesion: 0.18
Nodes (9): POST(), GET(), SessionDoc, loadUsersById(), publishSessionRemoved(), publishSessionUpserted(), SessionRealtimeDoc, toFetchedSession() (+1 more)

### Community 6 - "Community 6"
Cohesion: 0.13
Nodes (19): isJoinable(), LocalDateTime(), Props, formatRecentTime(), SessionCountdown(), SessionCountdownProps, formatLocalDate(), formatLocalDateTime() (+11 more)

### Community 7 - "Community 7"
Cohesion: 0.13
Nodes (13): bricolage, geistMono, geistSans, metadata, quicksandSans, siteUrl, siteUrl, siteUrl (+5 more)

### Community 8 - "Community 8"
Cohesion: 0.10
Nodes (28): BookSessionButton(), CreatedSession, Props, Calendar(), CalendarProps, ModalState, ProcessedEvent, SidebarProfilePreview (+20 more)

### Community 9 - "Community 9"
Cohesion: 0.06
Nodes (34): dependencies, ably, ai, @ai-sdk/google, @ai-sdk/openai, @auth/mongodb-adapter, bcryptjs, child_process (+26 more)

### Community 10 - "Community 10"
Cohesion: 0.23
Nodes (18): createInitialState(), uiReducer(), HoverState, UseCalendarGridReturn, addDays(), startOfDay(), addDaysInTimeZone(), getTimeZoneOffsetMs() (+10 more)

### Community 11 - "Community 11"
Cohesion: 0.12
Nodes (24): GET(), baseOptions, closeRedisConnections(), getPublisher(), getRedisState(), getSubscriber(), isMessageHandlerAttached(), isRedisConfigured() (+16 more)

### Community 12 - "Community 12"
Cohesion: 0.19
Nodes (16): emailAssetBaseUrl(), emailBrand, getEmailLogoDataUri(), getEmailLogoUrl(), buildMorningSessionDigestEmail(), buildTimedSessionReminderEmail(), emailShell(), greeting() (+8 more)

### Community 13 - "Community 13"
Cohesion: 0.09
Nodes (22): compilerOptions, allowJs, esModuleInterop, forceConsistentCasingInFileNames, incremental, isolatedModules, jsx, lib (+14 more)

### Community 14 - "Community 14"
Cohesion: 0.44
Nodes (7): hashVerificationToken(), isPasswordResetTokenValid(), resetPasswordWithToken(), setPasswordResetToken(), getClientIp(), GET(), POST()

### Community 15 - "Community 15"
Cohesion: 0.08
Nodes (30): DELETE(), GET(), GET(), GET(), GET(), GET(), GET(), IssuePriority (+22 more)

### Community 16 - "Community 16"
Cohesion: 0.19
Nodes (12): completeFirebaseSignIn(), extractDisplayName(), FirebaseOAuthButtons(), FirebaseOAuthButtonsProps, OAuthProvider, appleAuthProvider, firebaseConfig, getFirebaseApp() (+4 more)

### Community 17 - "Community 17"
Cohesion: 0.26
Nodes (15): logResendFailure(), sendPasswordResetEmail(), SendPasswordResetEmailInput, logResendFailure(), sendMorningSessionDigestEmail(), sendTimedSessionReminderEmail(), SendWelcomeEmailInput, sendWelcomeVerificationEmail() (+7 more)

### Community 18 - "Community 18"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 19 - "Community 19"
Cohesion: 0.08
Nodes (57): POST(), POST(), DELETE(), PATCH(), GET(), POST(), SessionDoc, POST() (+49 more)

### Community 20 - "Community 20"
Cohesion: 0.14
Nodes (9): Hero(), HeroProps, LogoutButton(), ThemeSwitcher(), VideoModal(), NavbarLogo(), Button, ButtonProps (+1 more)

### Community 21 - "Community 21"
Cohesion: 0.09
Nodes (22): AdminTag(), Props, Props, VerifiedNameProps, AvatarProps, AvatarTint, Presence, tintClass (+14 more)

### Community 22 - "Community 22"
Cohesion: 0.11
Nodes (8): MinimalNav(), MinimalNavProps, NavCta, Shell(), ShellProps, FEATURES, PageHeaderProps, Stat

### Community 23 - "Community 23"
Cohesion: 0.20
Nodes (3): AuthShell(), AuthShellProps, Props

### Community 24 - "Community 24"
Cohesion: 0.28
Nodes (4): ProvidersProps, defaultSwrConfig, FetchError, jsonFetcher()

### Community 25 - "Community 25"
Cohesion: 0.23
Nodes (13): ApiError, ApiResult, create(), CreateSessionPayload, deleteSession(), getErrorMessage(), join(), leave() (+5 more)

### Community 26 - "Community 26"
Cohesion: 0.18
Nodes (20): DELETE(), DELETE(), DELETE(), DELETE(), DELETE(), PATCH(), DELETE(), DELETE() (+12 more)

### Community 27 - "Community 27"
Cohesion: 0.14
Nodes (7): DEFAULT_PREFS, FocusPreferences(), NotificationsSection(), Prefs, PrivacySection(), usePrefs(), listTimeZones()

### Community 28 - "Community 28"
Cohesion: 0.13
Nodes (15): devDependencies, autoprefixer, dotenv, eslint, eslint-config-next, @eslint/eslintrc, postcss, tailwindcss (+7 more)

### Community 29 - "Community 29"
Cohesion: 0.07
Nodes (23): formatPercent(), formatTotalMinutes(), ProfileStats(), RecentSession, Stats, StatsSummaryLine(), TrendDay, RecentSession (+15 more)

### Community 30 - "Community 30"
Cohesion: 0.11
Nodes (21): Community(), CommunityProps, MobileCommunityView, PINNED_ADMIN_POST, ProfilePreviewPayload, CommunityChat(), CommunityChatProps, GlobalMessage (+13 more)

### Community 31 - "Community 31"
Cohesion: 0.13
Nodes (12): EmailVerificationBanner(), EmailVerifiedBadge(), Props, ABOUT_ME_PROMPTS, AboutMeKey, EditableFields, emptyAboutMe(), ProfileView() (+4 more)

### Community 32 - "Community 32"
Cohesion: 0.15
Nodes (12): Chat & Realtime, code:block1 (MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>?retry), code:block2 (npm install), code:block3 (# development), Contributing, Deploy, Features, Getting started (local) (+4 more)

### Community 33 - "Community 33"
Cohesion: 0.13
Nodes (12): AuthLoadingOverlay(), AuthLoadingOverlayProps, DetailsForm(), AuthDivider(), LoginForm(), DInput, DInputProps, DPasswordInput (+4 more)

### Community 34 - "Community 34"
Cohesion: 0.20
Nodes (15): CalendarHeader(), CalendarHeaderProps, VIEW_OPTIONS, ViewDays, applyPreference(), resolveEffective(), TimezoneContext, TimezoneContextValue (+7 more)

### Community 35 - "Community 35"
Cohesion: 0.21
Nodes (5): CodeBlock(), create, rls, TutorialStep(), Checkbox

### Community 36 - "Community 36"
Cohesion: 0.18
Nodes (8): db, FUTURE_START, messagesCol, req, REQUEST_ID, rl, sessionRequestsCol, sessionsCol

### Community 37 - "Community 37"
Cohesion: 0.15
Nodes (13): scripts, build, db:backfill-attendance, db:backfill-participant-count, db:backfill-usernames, db:indexes, db:set-admin, dev (+5 more)

### Community 38 - "Community 38"
Cohesion: 0.19
Nodes (11): Matchmaking(), MatchUser, Badge(), BadgeProps, badgeVariants, Card, CardContent, CardDescription (+3 more)

### Community 39 - "Community 39"
Cohesion: 0.20
Nodes (8): db, FUTURE_END, FUTURE_START, pastEnd, pastStart, req, SESSION_ID, sessionsCol

### Community 40 - "Community 40"
Cohesion: 0.10
Nodes (19): ACTION_LABELS, AdminChatMessage, AdminPost, AdminSection, AdminUser, AuditEntry, ReportEntry, SECTIONS (+11 more)

### Community 41 - "Community 41"
Cohesion: 0.67
Nodes (4): unauthorizedCronResponse(), verifyCronSecret(), GET(), GET()

### Community 42 - "Community 42"
Cohesion: 0.22
Nodes (6): ButtonAsAnchor, ButtonAsButton, CommonProps, DButtonProps, Size, Variant

### Community 43 - "Community 43"
Cohesion: 0.29
Nodes (7): DELETE(), PATCH(), IssuePriority, IssueStatus, serializeIssue(), VALID_PRIORITIES, VALID_STATUSES

### Community 44 - "Community 44"
Cohesion: 0.22
Nodes (9): Before Submitting, code:bash (git push origin feature/your-feature-name), code:markdown (## Description), code:bash (git fetch upstream), code:bash (git checkout -b feature/your-feature-name), code:bash (git add .), PR Requirements, PR Template (+1 more)

### Community 45 - "Community 45"
Cohesion: 0.05
Nodes (39): BacklogPage(), BacklogIssue, IssuePriority, IssueStatus, PRIORITY_STYLES, STATUS_COLUMNS, Dashboard(), EmailVerificationStrip() (+31 more)

### Community 46 - "Community 46"
Cohesion: 0.09
Nodes (18): CommunityChatPanel(), Props, Profile(), Settings(), useWallpaperActive(), WallpaperContext, EmptyCardProps, Friends() (+10 more)

### Community 47 - "Community 47"
Cohesion: 0.36
Nodes (7): config, hostOf(), middleware(), MUTATING_METHODS, originMatchesHost(), pathIsProtected(), PROTECTED_PREFIXES

### Community 48 - "Community 48"
Cohesion: 0.25
Nodes (8): 1. Environment Configuration, 2. Install Dependencies, 3. Run the Development Server, 4. Verify Setup, code:env (# MongoDB Configuration), code:bash (npm install), code:bash (npm run dev), Development Setup

### Community 49 - "Community 49"
Cohesion: 0.25
Nodes (7): Code of Conduct, Contact, Contributing to Refocus, Getting Help, Recognition, Resources, Table of Contents

### Community 50 - "Community 50"
Cohesion: 0.27
Nodes (9): POST(), generateUsername(), AuthProviderKey, parseProvider(), resolveEmailVerified(), splitDisplayName(), upsertFirebaseUser(), UpsertFirebaseUserResult (+1 more)

### Community 51 - "Community 51"
Cohesion: 0.25
Nodes (7): db, past, req, rl, sessionsCol, start, tooFar

### Community 52 - "Community 52"
Cohesion: 0.25
Nodes (6): mocks, ownerReq, participantReq, req, SESSION_ID, tokenReq

### Community 53 - "Community 53"
Cohesion: 0.13
Nodes (23): GET(), GET(), GET(), POST(), GET(), GlobalMessageDoc, POST(), CommunityModerationFields (+15 more)

### Community 54 - "Community 54"
Cohesion: 0.29
Nodes (6): background_color, display, icons, name, short_name, theme_color

### Community 55 - "Community 55"
Cohesion: 0.29
Nodes (3): aiFeatures, cardVariants, containerVariants

### Community 56 - "Community 56"
Cohesion: 0.38
Nodes (3): BookingItem(), CalendarBooking(), minutesToTimeString()

### Community 57 - "Community 57"
Cohesion: 0.25
Nodes (6): db, friendRequestsCol, insertedId, messagesCol, req, mockRequest()

### Community 58 - "Community 58"
Cohesion: 0.13
Nodes (27): ReminderRunResult, runMorningSessionReminders(), runTimedSessionReminders(), sendTimedReminderForSession(), SESSION_REMINDER_TIMINGS, SessionReminderTiming, displayName(), findReminderRecipients() (+19 more)

### Community 59 - "Community 59"
Cohesion: 0.33
Nodes (3): FaqItem, faqItems, Props

### Community 61 - "Community 61"
Cohesion: 0.40
Nodes (5): CollectionIndexes, createCollectionIndexes(), INDEX_DEFINITIONS, IndexDefinition, runMigration()

### Community 62 - "Community 62"
Cohesion: 0.10
Nodes (24): ChatDock(), Friend, OpenChat, ChatMessage, FriendChat(), FriendChatProps, SessionRequestPayload, GlobalChat() (+16 more)

### Community 63 - "Community 63"
Cohesion: 0.40
Nodes (3): cardVariants, containerVariants, steps

### Community 64 - "Community 64"
Cohesion: 0.40
Nodes (4): compat, __dirname, eslintConfig, __filename

### Community 65 - "Community 65"
Cohesion: 0.25
Nodes (7): cspDirectives, cspHeader, firebaseAuthConnectSrc, firebaseAuthFrameSrc, firebaseAuthScriptSrc, nextConfig, securityHeaders

### Community 66 - "Community 66"
Cohesion: 0.40
Nodes (5): API Routes, Code Style, Coding Standards, File Organization, React Best Practices

### Community 67 - "Community 67"
Cohesion: 0.40
Nodes (5): code:bash (git clone https://github.com/YOUR_USERNAME/refocus-frontend.), code:bash (git remote add upstream https://github.com/ORIGINAL_OWNER/re), Fork and Clone, Getting Started, Prerequisites

### Community 68 - "Community 68"
Cohesion: 0.25
Nodes (7): jwks-rsa, jose, overrides, firebase-admin, @types/react, @types/react-dom, private

### Community 69 - "Community 69"
Cohesion: 0.40
Nodes (4): modified, now, response, result

### Community 70 - "Community 70"
Cohesion: 0.11
Nodes (27): Props, AdminContext, applyUserModeration(), deleteReportedContent(), resolveContentReport(), createDailyMeetingToken(), createOrGetDailyRoom(), isValidReportReason() (+19 more)

### Community 72 - "Community 72"
Cohesion: 0.50
Nodes (4): Branch Naming, Contribution Workflow, How to Contribute, Types of Contributions

### Community 73 - "Community 73"
Cohesion: 0.50
Nodes (4): code:bash (# Run linting), Running Tests, Testing, Testing Checklist

### Community 74 - "Community 74"
Cohesion: 0.50
Nodes (4): Good First Issues, Hacktoberfest, Hacktoberfest Guidelines, Hacktoberfest Tips

### Community 77 - "Community 77"
Cohesion: 0.67
Nodes (3): code:block6 (refocus-frontend/), Key Technologies, Project Structure

### Community 78 - "Community 78"
Cohesion: 0.67
Nodes (3): Creating Issues, Issue Guidelines, Issue Labels

### Community 93 - "Community 93"
Cohesion: 0.15
Nodes (7): CONFETTI_COLORS, ConfettiBurst, formatRemaining(), Phase, PrejoinInfo, SessionPartner, TimerPill()

### Community 94 - "Community 94"
Cohesion: 0.11
Nodes (21): CalendarEventCard(), CALENDAR_LAYOUT, DEFAULT_DURATION_FILTER, getResolvedSessionColor(), getSessionColorPresetIndex(), SESSION_COLOR_PRESETS, SESSION_STATUSES, SESSION_TYPES (+13 more)

### Community 98 - "Community 98"
Cohesion: 0.15
Nodes (10): formatTotalMinutes(), PastParticipant, PastSession, PastSessionsList(), PastSessionsListProps, StatsRow(), SessionsList(), SessionsTabs() (+2 more)

### Community 99 - "Community 99"
Cohesion: 0.12
Nodes (21): GET(), DELETE(), deleteManagedAvatar(), extensionForMime(), POST(), SessionJoinPage(), authOptions, AVATAR_ALLOWED_TYPES (+13 more)

### Community 102 - "Community 102"
Cohesion: 0.31
Nodes (8): NotFound(), ABOUT_ME_PROMPTS, generateMetadata(), getPublicUser(), getUser(), Props, PublicProfilePage(), siteUrl

### Community 103 - "Community 103"
Cohesion: 0.29
Nodes (6): db, dupError, insertedId, req, usersCol, mockDb()

### Community 106 - "Community 106"
Cohesion: 0.29
Nodes (5): db, existingId, insertedId, usersCol, mockCollection()

### Community 107 - "Community 107"
Cohesion: 0.09
Nodes (27): AdminChatMessage, AdminPost, AdminSection, AdminUser, NAV, Stats, CalendarEventCardProps, COMPACT_PASTEL_COLORS_DARK (+19 more)

### Community 112 - "Community 112"
Cohesion: 0.46
Nodes (6): isManagedWallpaperUrl(), WALLPAPER_ALLOWED_TYPES, DELETE(), deleteManagedWallpaper(), extensionForMime(), POST()

### Community 116 - "Community 116"
Cohesion: 0.21
Nodes (8): mocks, req, db, friendRequestsCol, req, REQUEST_ID, mockSession(), parseResponse()

## Knowledge Gaps
- **524 isolated node(s):** `MUTATING_METHODS`, `PROTECTED_PREFIXES`, `config`, `crons`, `config` (+519 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDb()` connect `Community 15` to `Community 99`, `Community 4`, `Community 5`, `Community 102`, `Community 70`, `Community 58`, `Community 7`, `Community 43`, `Community 14`, `Community 112`, `Community 17`, `Community 50`, `Community 19`, `Community 53`, `Community 26`?**
  _High betweenness centrality (0.130) - this node is a cross-community bridge._
- **Why does `Avatar()` connect `Community 107` to `Community 98`, `Community 99`, `Community 38`, `Community 6`, `Community 8`, `Community 40`, `Community 21`, `Community 30`, `Community 62`, `Community 29`, `Community 94`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `AvatarImage()` connect `Community 107` to `Community 98`, `Community 99`, `Community 38`, `Community 6`, `Community 8`, `Community 40`, `Community 21`, `Community 30`, `Community 62`, `Community 29`, `Community 94`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **What connects `MUTATING_METHODS`, `PROTECTED_PREFIXES`, `config` to the rest of the system?**
  _524 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.10541310541310542 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.06560283687943262 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.13911290322580644 - nodes in this community are weakly interconnected._