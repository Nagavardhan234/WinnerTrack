/**
 * Configuration file for WinnerTrack
 * Update the CSV URL from your published Google Sheets
 */

const CONFIG = {
    // TEST MODE - Set to true to use sample data (no Google Sheets needed)
    // Set to false when running on a web server with real Google Sheets
    // NOTE: The Google Sheets URL works fine on GitHub Pages but fails when opening
    //       index.html directly (file://) due to CORS. Use START_SERVER.bat to run locally.
    TEST_MODE: false,  // False = use real Google Sheets (works on web server)
    
    // Google Sheets CSV URL
    // STEP 1: Go to your sheet
    // STEP 2: File → Share → Publish to web
    // STEP 3: Select "CSV" (not Web page)
    // STEP 4: Click "Publish"
    // STEP 5: Copy the URL and paste below (replace the text in quotes)
    
    CSV_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTcCn_adSKcHHdIgs54VunvAD-d7d2DGudzC5SpztJ3TS_AdTfGQ2RzCeKsYHr6PWxVhF3XcsLY7k7Q/pub?gid=0&single=true&output=csv',
    
    // Example (replace with your actual URL):
    // CSV_URL: 'https://docs.google.com/spreadsheets/d/e/YOUR_SHEET_ID/pub?gid=0&single=true&output=csv',
    
    // Auto-refresh interval (in milliseconds)
    // Set to 0 to disable auto-refresh
    AUTO_REFRESH_INTERVAL: 300000, // 5 minutes
    
    // Display settings
    MAX_HISTORY_ITEMS: 20, // Initial history items to show
    HISTORY_LOAD_MORE: 10, // Items to load on "Load More" click
    
    // Feature toggles
    FEATURE_TOGGLES: {
        SHOW_PARTICIPANTS: true,
        SHOW_TIMELINE: true,
        SHOW_SCHEDULED_TOURNAMENTS: true,
        DATE_AWARE_MESSAGES: true
    },
    
    // Display preferences
    DISPLAY: {
        MAX_PARTICIPANTS_INLINE: 8, // Show "X players" if more
        MAX_TIMELINE_CARDS: 12, // Limit timeline view
        RECENT_THRESHOLD_DAYS: 7 // Days to consider "recent"
    },
    
    // Badge thresholds and configuration
    BADGES: {
        CONSISTENCY_WIN_RATE: 75,
        CONSISTENCY_MIN_SUNDAYS: 5,
        STREAK_THRESHOLD: 3,
        LIGHTNING_STREAK: 5,
        UNSTOPPABLE_STREAK: 7,
        GOLDEN_GLOVES_WINS: 10,
        MARATHON_SUNDAYS: 20,
        PERFECT_ATTENDANCE_WEEKS: 8,
        LEGEND_WINS: 50,
        PRECISION_WIN_RATE: 90,
        EFFICIENCY_MIN_SUNDAYS: 5,
        BALANCED_WIN_RATE_MIN: 45,
        BALANCED_WIN_RATE_MAX: 55,
        BALANCED_MIN_WINS: 15,
        UNIVERSAL_PARTNER_COUNT: 5,
        PERFECT_CHEMISTRY_MIN: 3,
        DUO_SPECIALIST_RATE: 70,
        FREE_AGENT_MIN_WINS: 5,
        TRIPLE_THREAT_SAME_DAY: 3,
        IRON_MAN_MIN_SUNDAYS: 10
    }
};

// Validate configuration on load
// FIX BUG #33: Add comprehensive validation
if (!CONFIG.TEST_MODE && CONFIG.CSV_URL === 'YOUR_GOOGLE_SHEETS_CSV_URL_HERE') {
    console.warn('⚠️ Please update the CSV_URL in config.js with your Google Sheets publish URL');
}

if (CONFIG.TEST_MODE) {
    console.log('🧪 TEST MODE is enabled - Using sample data');
    console.log('💡 Set TEST_MODE to false in config.js to connect to Google Sheets');
}

// FIX BUG #33: Validate numeric settings
(function validateConfig() {
    const errors = [];
    
    if (CONFIG.AUTO_REFRESH_INTERVAL < 0) {
        errors.push('AUTO_REFRESH_INTERVAL must be >= 0');
    }
    
    if (CONFIG.MAX_HISTORY_ITEMS < 1) {
        errors.push('MAX_HISTORY_ITEMS must be >= 1');
    }
    
    if (CONFIG.DISPLAY.MAX_PARTICIPANTS_INLINE < 1) {
        errors.push('MAX_PARTICIPANTS_INLINE must be >= 1');
    }
    
    // Validate badge thresholds
    if (CONFIG.BADGES.STREAK_THRESHOLD < 1) {
        errors.push('STREAK_THRESHOLD must be >= 1');
    }
    
    if (CONFIG.BADGES.CONSISTENCY_WIN_RATE < 0 || CONFIG.BADGES.CONSISTENCY_WIN_RATE > 100) {
        errors.push('CONSISTENCY_WIN_RATE must be between 0-100');
    }
    
    if (errors.length > 0) {
        console.error('❌ Config validation errors:', errors.join(', '));
    }
})();
