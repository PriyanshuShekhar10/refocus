# Graph Report - refocus  (2026-05-26)

## Corpus Check
- 227 files · ~102,969 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1100 nodes · 2045 edges · 94 communities (86 shown, 8 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `88e6b1eb`
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

## God Nodes (most connected - your core abstractions)
1. `getDb()` - 101 edges
2. `checkRateLimit()` - 51 edges
3. `authOptions` - 48 edges
4. `rateLimitedResponse()` - 46 edges
5. `publish()` - 32 edges
6. `DurationMin` - 23 edges
7. `compilerOptions` - 19 edges
8. `cn()` - 19 edges
9. `publishAbly()` - 18 edges
10. `areFriends()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `ChangePasswordSection()` --calls--> `validatePassword()`  [EXTRACTED]
  app/(product)/components/settings.tsx → lib/validatePassword.ts
- `CalendarSidebarProps` --references--> `DurationMin`  [EXTRACTED]
  app/(product)/components/Calendar/CalendarSidebar.tsx → constants/calendar.ts
- `UIState` --references--> `DurationMin`  [EXTRACTED]
  app/(product)/components/Mobile/MobileCalendar.tsx → constants/calendar.ts
- `MobileBottomSheetProps` --references--> `DurationMin`  [EXTRACTED]
  app/(product)/components/Mobile/MobileBottomSheet.tsx → constants/calendar.ts
- `formatRelativeDay()` --calls--> `startOfDay()`  [INFERRED]
  app/(product)/sessions/PastSessionsList.tsx → lib/utils.ts

## Communities (94 total, 8 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (26): BookSessionModalProps, AvatarProps, AvatarTint, Presence, tintClass, tintForKey(), EmptyCardProps, FriendRequestCard() (+18 more)

### Community 1 - "Community 1"
Cohesion: 0.12
Nodes (26): POST(), DELETE(), PATCH(), GET(), POST(), SessionDoc, POST(), POST() (+18 more)

### Community 2 - "Community 2"
Cohesion: 0.12
Nodes (16): GlobalMessage, ChatDock(), Friend, OpenChat, ChatMessage, FriendChatProps, SessionRequestPayload, GlobalMessage (+8 more)

### Community 3 - "Community 3"
Cohesion: 0.10
Nodes (18): ArrowIcon(), Faq(), FAQ_ITEMS, FaqItem, FinalCTA(), Footer(), AVATAR_COLORS, Hero() (+10 more)

### Community 4 - "Community 4"
Cohesion: 0.19
Nodes (18): DELETE(), PATCH(), DELETE(), POST(), DELETE(), POST(), GlobalMessageDoc, POST() (+10 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (16): BacklogIssue, IssuePriority, IssueStatus, PRIORITY_STYLES, STATUS_COLUMNS, Message, Proposal, SUGGESTIONS (+8 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (18): bricolage, geistMono, geistSans, metadata, quicksandSans, siteUrl, metadata, siteUrl (+10 more)

### Community 7 - "Community 7"
Cohesion: 0.18
Nodes (6): CONFETTI_COLORS, ConfettiBurst, formatRemaining(), Phase, PrejoinInfo, TimerPill()

### Community 8 - "Community 8"
Cohesion: 0.14
Nodes (23): baseOptions, closeRedisConnections(), getPublisher(), getRedisState(), getSubscriber(), isMessageHandlerAttached(), isRedisConfigured(), isSubscriberReady() (+15 more)

### Community 9 - "Community 9"
Cohesion: 0.07
Nodes (28): dependencies, ably, ai, @ai-sdk/google, @ai-sdk/openai, @auth/mongodb-adapter, bcryptjs, class-variance-authority (+20 more)

### Community 10 - "Community 10"
Cohesion: 0.12
Nodes (19): GET(), GET(), POST(), GET(), getDb(), GET(), PATCH(), regenerateEmbedding() (+11 more)

### Community 11 - "Community 11"
Cohesion: 0.10
Nodes (17): POST(), GET(), SessionJoinPage(), POST(), SessionDoc, authOptions, uri, sessionsChannel() (+9 more)

### Community 12 - "Community 12"
Cohesion: 0.12
Nodes (12): MySessionsPage(), RawSession, UserDoc, formatTotalMinutes(), PastParticipant, PastSession, PastSessionsList(), PastSessionsListProps (+4 more)

### Community 13 - "Community 13"
Cohesion: 0.09
Nodes (22): compilerOptions, allowJs, esModuleInterop, forceConsistentCasingInFileNames, incremental, isolatedModules, jsx, lib (+14 more)

### Community 14 - "Community 14"
Cohesion: 0.13
Nodes (16): CalendarHeader(), CalendarHeaderProps, VIEW_OPTIONS, ViewDays, Calendar(), CalendarProps, ModalState, ProcessedEvent (+8 more)

### Community 15 - "Community 15"
Cohesion: 0.21
Nodes (8): PasswordStrengthMeter(), Props, STRENGTH_LABELS, SignUpForm(), PasswordStrength, PasswordValidationResult, result, validatePassword()

### Community 16 - "Community 16"
Cohesion: 0.13
Nodes (23): createInitialState(), uiReducer(), formatRecentTime(), CALENDAR_LAYOUT, HoverState, UseCalendarGridOptions, UseCalendarGridReturn, addDays() (+15 more)

### Community 17 - "Community 17"
Cohesion: 0.12
Nodes (12): CreatedSession, Props, DEFAULT_DURATION_FILTER, isValidDuration(), SESSION_STATUSES, SESSION_TYPES, SessionStatus, SessionType (+4 more)

### Community 18 - "Community 18"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 19 - "Community 19"
Cohesion: 0.18
Nodes (12): getSessionColorPresetIndex(), SESSION_COLOR_PRESETS, ModalState, ProcessedEvent, UIAction, UIState, BookingModal(), ConfirmModal() (+4 more)

### Community 20 - "Community 20"
Cohesion: 0.18
Nodes (7): NotFound(), LogoutButton(), ThemeSwitcher(), NavbarLogo(), Button, ButtonProps, buttonVariants

### Community 21 - "Community 21"
Cohesion: 0.16
Nodes (15): GET(), GET(), DURATION_OPTIONS, GET(), MessageDoc, POST(), areFriends(), hasSessionOverlap() (+7 more)

### Community 22 - "Community 22"
Cohesion: 0.11
Nodes (13): MinimalNav(), MinimalNavProps, NavCta, Shell(), ShellProps, FEATURES, ABOUT_ME_PROMPTS, generateMetadata() (+5 more)

### Community 23 - "Community 23"
Cohesion: 0.16
Nodes (4): AuthShell(), AuthShellProps, DetailsForm(), LoginForm()

### Community 24 - "Community 24"
Cohesion: 0.09
Nodes (24): CalendarEventCard(), CalendarEventCardProps, COMPACT_PASTEL_COLORS_DARK, COMPACT_PASTEL_COLORS_LIGHT, isJoinable(), getResolvedSessionColor(), SessionCountdownProps, createDailyMeetingToken() (+16 more)

### Community 25 - "Community 25"
Cohesion: 0.23
Nodes (13): ApiError, ApiResult, create(), CreateSessionPayload, deleteSession(), getErrorMessage(), join(), leave() (+5 more)

### Community 26 - "Community 26"
Cohesion: 0.19
Nodes (10): DurationSelectorBaseProps, DurationSelectorProps, MultiSelectProps, SingleSelectProps, VARIANT_STYLES, UIState, DurationMin, UseCalendarSessionsOptions (+2 more)

### Community 27 - "Community 27"
Cohesion: 0.15
Nodes (7): ChangePasswordSection(), DEFAULT_PREFS, FocusPreferences(), NotificationsSection(), Prefs, PrivacySection(), usePrefs()

### Community 28 - "Community 28"
Cohesion: 0.13
Nodes (15): devDependencies, autoprefixer, dotenv, eslint, eslint-config-next, @eslint/eslintrc, postcss, tailwindcss (+7 more)

### Community 29 - "Community 29"
Cohesion: 0.18
Nodes (6): formatPercent(), formatTotalMinutes(), ProfileStats(), RecentSession, Stats, TrendDay

### Community 30 - "Community 30"
Cohesion: 0.19
Nodes (8): CommunityProps, PINNED_ADMIN_POST, ProfilePreviewPayload, Comment, Post, PostCardProps, Input, Textarea

### Community 31 - "Community 31"
Cohesion: 0.19
Nodes (7): ABOUT_ME_PROMPTS, AboutMeKey, EditableFields, emptyAboutMe(), ProfileView(), Props, UserInfo

### Community 32 - "Community 32"
Cohesion: 0.15
Nodes (12): Chat & Realtime, code:block1 (MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>?retry), code:block2 (npm install), code:block3 (# development), Contributing, Deploy, Features, Getting started (local) (+4 more)

### Community 33 - "Community 33"
Cohesion: 0.33
Nodes (8): DButton, DInput, DInputProps, DPasswordInput, DPasswordInputProps, DTextarea, Field(), FieldShellProps

### Community 34 - "Community 34"
Cohesion: 0.29
Nodes (9): CalendarRightSidebar(), CalendarRightSidebarProps, DetailedProfile, formatDate(), getGreeting(), cn(), Avatar(), AvatarFallback() (+1 more)

### Community 35 - "Community 35"
Cohesion: 0.21
Nodes (5): CodeBlock(), create, rls, TutorialStep(), Checkbox

### Community 36 - "Community 36"
Cohesion: 0.18
Nodes (8): db, FUTURE_START, messagesCol, req, REQUEST_ID, rl, sessionRequestsCol, sessionsCol

### Community 37 - "Community 37"
Cohesion: 0.18
Nodes (11): scripts, build, db:backfill-attendance, db:backfill-usernames, db:indexes, dev, graphify:update, lint (+3 more)

### Community 38 - "Community 38"
Cohesion: 0.27
Nodes (8): db, dupError, insertedId, req, usersCol, mockCollection(), mockDb(), mockRequest()

### Community 39 - "Community 39"
Cohesion: 0.20
Nodes (8): db, FUTURE_END, FUTURE_START, pastEnd, pastStart, req, SESSION_ID, sessionsCol

### Community 40 - "Community 40"
Cohesion: 0.20
Nodes (9): DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut(), DropdownMenuSubContent (+1 more)

### Community 41 - "Community 41"
Cohesion: 0.31
Nodes (7): MatchUser, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle

### Community 42 - "Community 42"
Cohesion: 0.22
Nodes (6): ButtonAsAnchor, ButtonAsButton, CommonProps, DButtonProps, Size, Variant

### Community 43 - "Community 43"
Cohesion: 0.40
Nodes (5): CalendarSidebar(), CalendarSidebarProps, formatUpcomingDate(), toYmd(), TIME_CONFIG

### Community 44 - "Community 44"
Cohesion: 0.22
Nodes (9): Before Submitting, code:bash (git push origin feature/your-feature-name), code:markdown (## Description), code:bash (git fetch upstream), code:bash (git checkout -b feature/your-feature-name), code:bash (git add .), PR Requirements, PR Template (+1 more)

### Community 45 - "Community 45"
Cohesion: 0.29
Nodes (7): DELETE(), PATCH(), IssuePriority, IssueStatus, serializeIssue(), VALID_PRIORITIES, VALID_STATUSES

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (5): MobileBottomNav(), MobileBottomNavProps, MobileTab, MobileBottomSheet(), MobileBottomSheetProps

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
Cohesion: 0.25
Nodes (6): db, friendRequestsCol, insertedId, messagesCol, req, parseResponse()

### Community 51 - "Community 51"
Cohesion: 0.25
Nodes (7): db, past, req, rl, sessionsCol, start, tooFar

### Community 52 - "Community 52"
Cohesion: 0.25
Nodes (6): mocks, ownerReq, participantReq, req, SESSION_ID, tokenReq

### Community 53 - "Community 53"
Cohesion: 0.33
Nodes (6): GET(), IssuePriority, IssueStatus, POST(), serializeIssue(), VALID_PRIORITIES

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
Cohesion: 0.29
Nodes (5): db, friendRequestsCol, req, REQUEST_ID, mockSession()

### Community 58 - "Community 58"
Cohesion: 0.47
Nodes (5): cache, CacheEntry, getCached(), POST(), setCache()

### Community 59 - "Community 59"
Cohesion: 0.33
Nodes (3): FaqItem, faqItems, Props

### Community 61 - "Community 61"
Cohesion: 0.40
Nodes (5): CollectionIndexes, createCollectionIndexes(), INDEX_DEFINITIONS, IndexDefinition, runMigration()

### Community 62 - "Community 62"
Cohesion: 0.47
Nodes (3): Badge(), BadgeProps, badgeVariants

### Community 63 - "Community 63"
Cohesion: 0.40
Nodes (3): cardVariants, containerVariants, steps

### Community 64 - "Community 64"
Cohesion: 0.40
Nodes (4): compat, __dirname, eslintConfig, __filename

### Community 65 - "Community 65"
Cohesion: 0.40
Nodes (4): cspDirectives, cspHeader, nextConfig, securityHeaders

### Community 66 - "Community 66"
Cohesion: 0.40
Nodes (5): API Routes, Code Style, Coding Standards, File Organization, React Best Practices

### Community 67 - "Community 67"
Cohesion: 0.40
Nodes (5): code:bash (git clone https://github.com/YOUR_USERNAME/refocus-frontend.), code:bash (git remote add upstream https://github.com/ORIGINAL_OWNER/re), Fork and Clone, Getting Started, Prerequisites

### Community 68 - "Community 68"
Cohesion: 0.40
Nodes (4): overrides, @types/react, @types/react-dom, private

### Community 69 - "Community 69"
Cohesion: 0.40
Nodes (4): modified, now, response, result

### Community 70 - "Community 70"
Cohesion: 0.50
Nodes (3): Hero(), HeroProps, VideoModal()

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

## Knowledge Gaps
- **426 isolated node(s):** `MUTATING_METHODS`, `PROTECTED_PREFIXES`, `config`, `config`, `private` (+421 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDb()` connect `Community 10` to `Community 1`, `Community 4`, `Community 11`, `Community 12`, `Community 45`, `Community 21`, `Community 22`, `Community 53`, `Community 24`?**
  _High betweenness centrality (0.104) - this node is a cross-community bridge._
- **Why does `authOptions` connect `Community 11` to `Community 1`, `Community 2`, `Community 4`, `Community 8`, `Community 10`, `Community 12`, `Community 45`, `Community 20`, `Community 21`, `Community 53`, `Community 23`, `Community 24`, `Community 58`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Why does `DurationMin` connect `Community 26` to `Community 4`, `Community 43`, `Community 14`, `Community 46`, `Community 16`, `Community 17`, `Community 19`, `Community 21`, `Community 25`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **What connects `MUTATING_METHODS`, `PROTECTED_PREFIXES`, `config` to the rest of the system?**
  _426 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05858585858585859 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.12162162162162163 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.11965811965811966 - nodes in this community are weakly interconnected._