# Graph Report - refocus  (2026-08-08)

## Corpus Check
- 357 files · ~144,631 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1812 nodes · 4171 edges · 126 communities (116 shown, 10 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c40f03fa`
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
- [[_COMMUNITY_Community 97|Community 97]]
- [[_COMMUNITY_Community 98|Community 98]]
- [[_COMMUNITY_Community 99|Community 99]]
- [[_COMMUNITY_Community 101|Community 101]]
- [[_COMMUNITY_Community 102|Community 102]]
- [[_COMMUNITY_Community 103|Community 103]]
- [[_COMMUNITY_Community 104|Community 104]]
- [[_COMMUNITY_Community 105|Community 105]]
- [[_COMMUNITY_Community 106|Community 106]]
- [[_COMMUNITY_Community 107|Community 107]]
- [[_COMMUNITY_Community 108|Community 108]]
- [[_COMMUNITY_Community 109|Community 109]]
- [[_COMMUNITY_Community 110|Community 110]]
- [[_COMMUNITY_Community 111|Community 111]]
- [[_COMMUNITY_Community 112|Community 112]]
- [[_COMMUNITY_Community 113|Community 113]]
- [[_COMMUNITY_Community 114|Community 114]]
- [[_COMMUNITY_Community 115|Community 115]]
- [[_COMMUNITY_Community 116|Community 116]]
- [[_COMMUNITY_Community 117|Community 117]]
- [[_COMMUNITY_Community 118|Community 118]]
- [[_COMMUNITY_Community 119|Community 119]]
- [[_COMMUNITY_Community 120|Community 120]]
- [[_COMMUNITY_Community 121|Community 121]]

## God Nodes (most connected - your core abstractions)
1. `getDb()` - 181 edges
2. `checkRateLimit()` - 70 edges
3. `requireVerifiedEmail()` - 66 edges
4. `rateLimitedResponse()` - 65 edges
5. `authOptions` - 59 edges
6. `publish()` - 40 edges
7. `resolveAvatarUrl()` - 34 edges
8. `publishAbly()` - 30 edges
9. `requireAdmin()` - 29 edges
10. `Avatar()` - 26 edges

## Surprising Connections (you probably didn't know these)
- `Settings()` --calls--> `useWallpaperActive()`  [EXTRACTED]
  app/(product)/components/settings.tsx → components/wallpaper-context.tsx
- `Matchmaking()` --calls--> `useEmailVerified()`  [EXTRACTED]
  app/(product)/components/Matchmaking.tsx → hooks/useEmailVerified.ts
- `BookSessionModal()` --calls--> `useCommunityModeration()`  [EXTRACTED]
  app/(product)/components/BookSessionModal.tsx → hooks/useCommunityModeration.ts
- `CommunityChat()` --calls--> `displayName()`  [INFERRED]
  app/(product)/components/Community/CommunityChat.tsx → lib/sessionReminders.ts
- `MySessionsPage()` --calls--> `getDb()`  [EXTRACTED]
  app/(product)/sessions/page.tsx → lib/mongodb.ts

## Communities (126 total, 10 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.17
Nodes (12): CalendarSidebarProps, DurationSelectorBaseProps, DurationSelectorProps, MultiSelectProps, SingleSelectProps, VARIANT_STYLES, UIState, DurationMin (+4 more)

### Community 1 - "Community 1"
Cohesion: 0.13
Nodes (16): UseCalendarSessionsOptions, UseCalendarSessionsReturn, addMinutes(), clamp(), formatHour(), minutesBetween(), pad(), a (+8 more)

### Community 2 - "Community 2"
Cohesion: 0.14
Nodes (23): GET(), GET(), DURATION_OPTIONS, GET(), MessageDoc, POST(), POST(), areUsersBlocked() (+15 more)

### Community 3 - "Community 3"
Cohesion: 0.12
Nodes (11): FAQ_ITEMS, FaqItem, RevealProps, REASONS, Faq(), FAQ_ITEMS, FaqItem, Reveal() (+3 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (29): AllValuesOf, AnyEntryMap, CollectionEntry, CollectionKey, ContentCollectionKey, ContentConfig, ContentEntryMap, DataCollectionKey (+21 more)

### Community 5 - "Community 5"
Cohesion: 0.12
Nodes (18): LocalDateTime(), Props, formatRecentTime(), SessionCountdown(), SessionCountdownProps, formatLocalDate(), formatLocalDateTime(), formatLocalTime() (+10 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (41): GET(), isJoinable(), createDailyMeetingToken(), createOrGetDailyRoom(), isOwnerOrParticipant(), toObjectId(), resolveSessionDisplayName(), SessionLabelSource (+33 more)

### Community 7 - "Community 7"
Cohesion: 0.16
Nodes (14): siteUrl, siteUrl, emailAssetBaseUrl(), emailBrand, getEmailLogoDataUri(), getEmailLogoUrl(), buildPasswordResetEmail(), buildWelcomeVerifyEmail() (+6 more)

### Community 8 - "Community 8"
Cohesion: 0.16
Nodes (16): BookSessionButton(), CreatedSession, Props, Calendar(), CalendarProps, ModalState, ProcessedEvent, SidebarProfilePreview (+8 more)

### Community 9 - "Community 9"
Cohesion: 0.06
Nodes (34): dependencies, ably, ai, @ai-sdk/google, @ai-sdk/openai, @auth/mongodb-adapter, bcryptjs, child_process (+26 more)

### Community 10 - "Community 10"
Cohesion: 0.23
Nodes (18): createInitialState(), uiReducer(), HoverState, UseCalendarGridReturn, addDays(), startOfDay(), addDaysInTimeZone(), getTimeZoneOffsetMs() (+10 more)

### Community 11 - "Community 11"
Cohesion: 0.23
Nodes (11): DELETE(), PATCH(), POST(), GET(), SessionDoc, applyParticipantLabel(), normalizeSessionLabel(), loadUsersById() (+3 more)

### Community 12 - "Community 12"
Cohesion: 0.14
Nodes (12): Career(), openRoles, AuthButtons(), cn(), Navbar(), navItems, ArrowIcon(), url() (+4 more)

### Community 13 - "Community 13"
Cohesion: 0.09
Nodes (22): compilerOptions, allowJs, esModuleInterop, forceConsistentCasingInFileNames, incremental, isolatedModules, jsx, lib (+14 more)

### Community 14 - "Community 14"
Cohesion: 0.36
Nodes (9): baseOptions, closeRedisConnections(), getRedisState(), getSubscriber(), isMessageHandlerAttached(), isSubscriberReady(), RedisState, setMessageHandlerAttached() (+1 more)

### Community 15 - "Community 15"
Cohesion: 0.13
Nodes (22): GET(), GET(), GET(), POST(), GET(), GlobalMessageDoc, POST(), CommunityModerationFields (+14 more)

### Community 16 - "Community 16"
Cohesion: 0.19
Nodes (12): completeFirebaseSignIn(), extractDisplayName(), FirebaseOAuthButtons(), FirebaseOAuthButtonsProps, OAuthProvider, appleAuthProvider, firebaseConfig, getFirebaseApp() (+4 more)

### Community 17 - "Community 17"
Cohesion: 0.33
Nodes (7): AvatarCropModal(), Props, clampCropOffset(), cropAvatarToBlob(), CropTransform, loadImage(), result

### Community 18 - "Community 18"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 19 - "Community 19"
Cohesion: 0.08
Nodes (43): GET(), POST(), SessionDoc, POST(), POST(), detachDeletedUserFromSessions(), FocusSessionDoc, POST() (+35 more)

### Community 20 - "Community 20"
Cohesion: 0.10
Nodes (16): NotFound(), Hero(), HeroProps, LogoutButton(), ThemeSwitcher(), VideoModal(), SessionJoinPage(), cn() (+8 more)

### Community 21 - "Community 21"
Cohesion: 0.09
Nodes (33): CalendarSidebar(), formatUpcomingDate(), toYmd(), BookSessionModal(), BookSessionModalProps, ChatDock(), Friend, OpenChat (+25 more)

### Community 22 - "Community 22"
Cohesion: 0.10
Nodes (16): metadata, openRoles, siteUrl, MinimalNav(), MinimalNavProps, NavCta, Shell(), ShellProps (+8 more)

### Community 23 - "Community 23"
Cohesion: 0.16
Nodes (4): AuthShell(), AuthShellProps, SignUpForm(), Props

### Community 24 - "Community 24"
Cohesion: 0.28
Nodes (4): ProvidersProps, defaultSwrConfig, FetchError, jsonFetcher()

### Community 25 - "Community 25"
Cohesion: 0.16
Nodes (16): ApiError, ApiResult, create(), CreateSessionPayload, deleteSession(), getErrorMessage(), join(), leave() (+8 more)

### Community 26 - "Community 26"
Cohesion: 0.14
Nodes (30): DELETE(), DELETE(), DELETE(), DELETE(), PATCH(), DELETE(), POST(), getRestClient() (+22 more)

### Community 27 - "Community 27"
Cohesion: 0.08
Nodes (17): PasswordStrengthMeter(), Props, STRENGTH_LABELS, ChangePasswordSection(), DEFAULT_PREFS, FocusPreferences(), NotificationsSection(), Prefs (+9 more)

### Community 28 - "Community 28"
Cohesion: 0.13
Nodes (15): devDependencies, autoprefixer, dotenv, eslint, eslint-config-next, @eslint/eslintrc, postcss, tailwindcss (+7 more)

### Community 29 - "Community 29"
Cohesion: 0.13
Nodes (16): RecentSession, SessionStats, StatsResponse, TrendDay, useSessionStats(), SessionStatsDashboard(), ProfileStats(), ActivityHeatmap() (+8 more)

### Community 30 - "Community 30"
Cohesion: 0.11
Nodes (20): Community(), CommunityProps, MobileCommunityView, PINNED_ADMIN_POST, ProfilePreviewPayload, CommunityChatProps, GlobalMessage, AuthorLike (+12 more)

### Community 31 - "Community 31"
Cohesion: 0.13
Nodes (12): EmailVerificationBanner(), EmailVerifiedBadge(), Props, ABOUT_ME_PROMPTS, AboutMeKey, EditableFields, emptyAboutMe(), ProfileView() (+4 more)

### Community 32 - "Community 32"
Cohesion: 0.15
Nodes (12): Chat & Realtime, code:block1 (MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>?retry), code:block2 (npm install), code:block3 (# development), Contributing, Deploy, Features, Getting started (local) (+4 more)

### Community 33 - "Community 33"
Cohesion: 0.15
Nodes (12): AuthLoadingOverlay(), AuthLoadingOverlayProps, DetailsForm(), AuthDivider(), LoginForm(), DInput, DInputProps, DPasswordInput (+4 more)

### Community 34 - "Community 34"
Cohesion: 0.21
Nodes (13): CalendarHeader(), CalendarHeaderProps, VIEW_OPTIONS, ViewDays, applyPreference(), resolveEffective(), TimezoneContext, TimezoneContextValue (+5 more)

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
Cohesion: 0.31
Nodes (8): Matchmaking(), MatchUser, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle

### Community 39 - "Community 39"
Cohesion: 0.20
Nodes (8): db, FUTURE_END, FUTURE_START, pastEnd, pastStart, req, SESSION_ID, sessionsCol

### Community 40 - "Community 40"
Cohesion: 0.11
Nodes (18): ACTION_LABELS, AdminChatMessage, AdminPost, AdminSection, AdminUser, AuditEntry, ReportEntry, SECTIONS (+10 more)

### Community 41 - "Community 41"
Cohesion: 0.22
Nodes (8): Audit Log - Codebase Review, Audit Process, Findings & Conclusion, Fixes Applied, Phase 2: Deep Scalability Audit (Memory & Realtime), Phase 4: DRY Code & Logic Consolidation, Phase 5: Deep Scalability Audit (Cron & Reminders), Production Infrastructure & Scaling Fixes

### Community 42 - "Community 42"
Cohesion: 0.22
Nodes (6): ButtonAsAnchor, ButtonAsButton, CommonProps, DButtonProps, Size, Variant

### Community 43 - "Community 43"
Cohesion: 0.10
Nodes (24): DELETE(), PATCH(), DELETE(), POST(), IssuePriority, IssueStatus, serializeIssue(), VALID_PRIORITIES (+16 more)

### Community 44 - "Community 44"
Cohesion: 0.22
Nodes (9): Before Submitting, code:bash (git push origin feature/your-feature-name), code:markdown (## Description), code:bash (git fetch upstream), code:bash (git checkout -b feature/your-feature-name), code:bash (git add .), PR Requirements, PR Template (+1 more)

### Community 45 - "Community 45"
Cohesion: 0.05
Nodes (39): BacklogPage(), BacklogIssue, IssuePriority, IssueStatus, PRIORITY_STYLES, STATUS_COLUMNS, Dashboard(), EmailVerificationStrip() (+31 more)

### Community 46 - "Community 46"
Cohesion: 0.07
Nodes (19): CommunityChatPanel(), Props, Profile(), useWallpaperActive(), WallpaperContext, EmptyCardProps, Friends(), FriendsProps (+11 more)

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
Cohesion: 0.13
Nodes (13): CalendarEventCardProps, COMPACT_PASTEL_COLORS_DARK, COMPACT_PASTEL_COLORS_LIGHT, CalendarRightSidebar(), CalendarRightSidebarProps, DetailedProfile, formatDate(), getGreeting() (+5 more)

### Community 51 - "Community 51"
Cohesion: 0.25
Nodes (7): db, past, req, rl, sessionsCol, start, tooFar

### Community 52 - "Community 52"
Cohesion: 0.13
Nodes (15): mocks, req, db, friendRequestsCol, req, REQUEST_ID, mocks, ownerReq (+7 more)

### Community 53 - "Community 53"
Cohesion: 0.09
Nodes (21): dependencies, astro, @astrojs/react, @fontsource/geist-mono, @fontsource-variable/bricolage-grotesque, jose, react, react-dom (+13 more)

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
Cohesion: 0.15
Nodes (11): CURRENT_USER, db, FRIEND_ID, friendRequestsCol, insertedId, messagesCol, req, sessionRequestsCol (+3 more)

### Community 58 - "Community 58"
Cohesion: 0.15
Nodes (28): ReminderRunResult, runMorningSessionReminders(), runTimedSessionReminders(), sendTimedReminderForSession(), bulkLoadReminderRecipients(), displayName(), findReminderRecipients(), findSessionsStartingInRange() (+20 more)

### Community 59 - "Community 59"
Cohesion: 0.33
Nodes (3): FaqItem, faqItems, Props

### Community 61 - "Community 61"
Cohesion: 0.40
Nodes (5): CollectionIndexes, createCollectionIndexes(), INDEX_DEFINITIONS, IndexDefinition, runMigration()

### Community 62 - "Community 62"
Cohesion: 0.12
Nodes (18): FriendChatInputProps, CommunityChat(), ChatMessage, FriendChat(), FriendChatProps, SessionRequestPayload, GlobalChat(), GlobalMessage (+10 more)

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
Cohesion: 0.08
Nodes (47): AdminPage(), metadata, GET(), DELETE(), GET(), GET(), GET(), GET() (+39 more)

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

### Community 97 - "Community 97"
Cohesion: 0.10
Nodes (8): FAQ_ITEMS, FaqItem, Mode, Modes, RevealProps, Length, LENGTHS, REASONS

### Community 98 - "Community 98"
Cohesion: 0.15
Nodes (7): formatPercent(), formatTotalMinutes(), ProfileStats(), RecentSession, Stats, StatsSummaryLine(), TrendDay

### Community 99 - "Community 99"
Cohesion: 0.11
Nodes (21): GET(), DELETE(), deleteManagedAvatar(), extensionForMime(), POST(), authOptions, useSecureCookies, client (+13 more)

### Community 101 - "Community 101"
Cohesion: 0.33
Nodes (12): logResendFailure(), sendPasswordResetEmail(), SendPasswordResetEmailInput, logResendFailure(), sendMorningSessionDigestEmail(), sendTimedSessionReminderEmail(), SendWelcomeEmailInput, sendWelcomeVerificationEmail() (+4 more)

### Community 102 - "Community 102"
Cohesion: 0.20
Nodes (10): formatRelativeTime(), Partner, RecentSessionPartners(), statusPillStyle, Props, REPORT_REASON_LABELS, REPORT_REASONS, ReportReason (+2 more)

### Community 103 - "Community 103"
Cohesion: 0.29
Nodes (6): db, dupError, insertedId, req, usersCol, mockDb()

### Community 105 - "Community 105"
Cohesion: 0.16
Nodes (7): Length, LENGTHS, FinalCTA(), Footer(), Length, LENGTHS, Sessions()

### Community 106 - "Community 106"
Cohesion: 0.29
Nodes (5): db, existingId, insertedId, usersCol, mockCollection()

### Community 107 - "Community 107"
Cohesion: 0.22
Nodes (6): AdminChatMessage, AdminPost, AdminSection, AdminUser, NAV, Stats

### Community 108 - "Community 108"
Cohesion: 0.14
Nodes (12): @fontsource/geist-mono/400.css, @fontsource/geist-mono/500.css, @fontsource-variable/bricolage-grotesque, ../layouts/Base.astro, careerJsonLd, jobPostingJsonLd, openRoles, orgJsonLd (+4 more)

### Community 109 - "Community 109"
Cohesion: 0.15
Nodes (4): Mode, Modes, Mode, Modes

### Community 110 - "Community 110"
Cohesion: 0.27
Nodes (9): POST(), generateUsername(), AuthProviderKey, parseProvider(), resolveEmailVerified(), splitDisplayName(), upsertFirebaseUser(), UpsertFirebaseUserResult (+1 more)

### Community 111 - "Community 111"
Cohesion: 0.33
Nodes (8): createVerificationToken(), hashVerificationToken(), setEmailVerificationToken(), verifyEmailWithToken(), createPasswordResetToken(), isPasswordResetTokenValid(), GET(), GET()

### Community 112 - "Community 112"
Cohesion: 0.29
Nodes (9): deriveKey(), Env, hasValidSession(), onRequest(), PagesContext, parseCookies(), readSessionToken(), REDIRECT_PATHS (+1 more)

### Community 114 - "Community 114"
Cohesion: 0.25
Nodes (4): AVATAR_COLORS, AVATAR_COLORS, Hero(), LiveCount()

### Community 115 - "Community 115"
Cohesion: 0.25
Nodes (6): bricolage, geistMono, geistSans, metadata, quicksandSans, siteUrl

### Community 116 - "Community 116"
Cohesion: 0.32
Nodes (4): metadata, siteUrl, LandingLightLock(), Homepage()

### Community 117 - "Community 117"
Cohesion: 0.46
Nodes (6): buildMorningSessionDigestEmail(), buildTimedSessionReminderEmail(), emailShell(), greeting(), sessionListHtml(), sessionListText()

### Community 118 - "Community 118"
Cohesion: 0.67
Nodes (4): unauthorizedCronResponse(), verifyCronSecret(), GET(), GET()

### Community 119 - "Community 119"
Cohesion: 0.38
Nodes (5): SESSION_REMINDER_TIMINGS, SessionReminderTiming, DEFAULTS, GET(), Prefs

### Community 120 - "Community 120"
Cohesion: 0.17
Nodes (12): formatBookTime(), getDefaultBookTime(), ModalState, normalizeBookTime(), ProcessedEvent, snapBookTimeMinutes(), UIAction, ConfirmModal() (+4 more)

### Community 121 - "Community 121"
Cohesion: 0.29
Nodes (6): compilerOptions, jsx, jsxImportSource, exclude, extends, include

## Knowledge Gaps
- **634 isolated node(s):** `MUTATING_METHODS`, `PROTECTED_PREFIXES`, `config`, `crons`, `config` (+629 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDb()` connect `Community 70` to `Community 2`, `Community 99`, `Community 58`, `Community 101`, `Community 6`, `Community 43`, `Community 11`, `Community 110`, `Community 15`, `Community 111`, `Community 19`, `Community 20`, `Community 21`, `Community 22`, `Community 119`, `Community 26`, `Community 27`?**
  _High betweenness centrality (0.117) - this node is a cross-community bridge._
- **Why does `DurationMin` connect `Community 0` to `Community 1`, `Community 2`, `Community 6`, `Community 8`, `Community 10`, `Community 21`, `Community 120`, `Community 25`, `Community 26`, `Community 94`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `authOptions` connect `Community 99` to `Community 33`, `Community 2`, `Community 6`, `Community 70`, `Community 43`, `Community 11`, `Community 15`, `Community 19`, `Community 20`, `Community 21`, `Community 119`, `Community 26`, `Community 62`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **What connects `MUTATING_METHODS`, `PROTECTED_PREFIXES`, `config` to the rest of the system?**
  _634 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.12648221343873517 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.13903743315508021 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.12280701754385964 - nodes in this community are weakly interconnected._