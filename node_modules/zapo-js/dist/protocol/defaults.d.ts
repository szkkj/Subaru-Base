export declare const WA_DEFAULTS: Readonly<{
    readonly HOST_DOMAIN: "s.whatsapp.net";
    readonly GROUP_SERVER: "g.us";
    readonly BROADCAST_SERVER: "broadcast";
    readonly LID_SERVER: "lid";
    readonly HOSTED_SERVER: "hosted";
    readonly HOSTED_LID_SERVER: "hosted.lid";
    readonly HOSTED_DEVICE_ID: 99;
    readonly MSGR_SERVER: "msgr";
    readonly INTEROP_SERVER: "interop";
    readonly NEWSLETTER_SERVER: "newsletter";
    readonly BOT_SERVER: "bot";
    readonly STATUS_BROADCAST_JID: "status@broadcast";
    readonly DEVICE_BROWSER: "firefox";
    readonly DEVICE_PLATFORM: string;
    readonly CHAT_SOCKET_URLS: readonly ["wss://web.whatsapp.com/ws/chat", "wss://web.whatsapp.com:5222/ws/chat"];
    readonly NOISE_RESUME_FAILURES_BEFORE_FULL_HANDSHAKE: 1;
    readonly IQ_TIMEOUT_MS: 15000;
    /**
     * Quiet window before an `account_sync` privacy notification triggers the
     * refetch, so flipping several settings in a row on the phone collapses
     * into one refresh instead of one per notification.
     */
    readonly PRIVACY_ACCOUNT_SYNC_DEBOUNCE_MS: 1000;
    readonly NODE_QUERY_TIMEOUT_MS: 15000;
    readonly CONNECT_TIMEOUT_MS: 10000;
    readonly SOCKET_TIMEOUT_MS: 10000;
    readonly RECONNECT_INTERVAL_MS: 2000;
    readonly HEALTH_CHECK_INTERVAL_MS: 15000;
    readonly DEAD_SOCKET_TIMEOUT_MS: 20000;
    readonly MEDIA_TIMEOUT_MS: 30000;
    /**
     * How long a media-reupload request waits for the `mediaretry`
     * notification. The sender's primary device has to be reachable and
     * re-upload the file, so this is deliberately longer than an IQ timeout.
     */
    readonly MEDIA_RETRY_TIMEOUT_MS: 60000;
    /** In-flight media-reupload requests kept in memory; the oldest is rejected past it. */
    readonly MAX_PENDING_MEDIA_RETRIES: 64;
    readonly APP_STATE_SYNC_TIMEOUT_MS: 30000;
    readonly SIGNAL_FETCH_KEY_BUNDLES_TIMEOUT_MS: 20000;
    readonly MESSAGE_ACK_TIMEOUT_MS: 10000;
    readonly MESSAGE_MAX_ATTEMPTS: 3;
    readonly MESSAGE_RETRY_DELAY_MS: 750;
    readonly PAIRING_CODE_MAX_AGE_SECONDS: 180;
    readonly PAIRING_CODE_MAX_PRIMARY_HELLOS: 3;
    readonly QR_INITIAL_TTL_MS: 60000;
    readonly QR_ROTATION_TTL_MS: 20000;
    readonly MAX_DANGLING_RECEIPTS: 2048;
}>;
