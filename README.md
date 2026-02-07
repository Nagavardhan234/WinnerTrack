# 🏸 WinnerTrack - Sunday Badminton Tournament Tracker

A **free, auto-updating website** that tracks doubles badminton tournament winners, automatically calculates statistics, rankings, and badges from a simple Google Sheets database.

## ✨ Features

- 🏆 **Latest Winners Display** - Showcase this week's tournament champions
- 📊 **Auto-Calculated Rankings** - Individual player leaderboard with win rates
- 🔗 **Best Duos Tracking** - Identify strongest pair combinations
- 🔥 **Streak Detection** - Automatic streak tracking and motivation
- 🎖️ **Dynamic Badges** - Auto-assigned badges (Sunday King, Best Duo, Iron Man, etc.)
- 📜 **Tournament History** - Complete hall of fame
- 📱 **Fully Responsive** - Flawless on mobile, tablet, and desktop
- 🆓 **100% Free** - No backend, no API costs, no subscriptions

---

## 🚀 Quick Start

### Step 1: Setup Google Sheets

1. **Create a new Google Sheet** with this structure:

| Date | Participants | TournamentsPlayed | Teams | Winners |
|------|--------------|-------------------|-------|----------|
| 08-02-2026 | Naveen,Vardhan,Kishore,Vivek,Ravi,Kumar | 2 | Team C, Team D | 1-Naveen and Vardhan, 2-Kishore and Vivek |
| 15-02-2026 | Naveen,Vardhan,Kishore,Vivek | 1 | Team A | 1-Vardhan and Kishore |

**Column Requirements:**
- **Date** - Format: `DD-MM-YYYY` (e.g., 08-02-2026) or `YYYY-MM-DD`
- **Participants** - All player names comma-separated (e.g., `Naveen,Vardhan,Kishore,Vivek`)
- **TournamentsPlayed** - Number of tournaments that day (e.g., `1`, `2`, `3`)
- **Teams** - Team names comma-separated (optional, e.g., `Team A, Team B`)
- **Winners** - Format: `1-Player1 and Player2, 2-Player3 and Player4`
  - Use format: `[tournament#]-[Name1] and [Name2]`
  - Separate multiple tournaments with commas
  - Can use "and" or "&" between partner names

**Example for 3 tournaments:**
```
Winners: 1-Naveen and Vardhan, 2-Kishore and Vivek, 3-Ravi and Kumar
```

2. **Publish the sheet as CSV:**
   - File → Share → **Publish to web**
   - Select the sheet with tournament data
   - Choose **"Comma-separated values (.csv)"**
   - Click **Publish**
   - **Copy the CSV URL** (looks like: `https://docs.google.com/spreadsheets/d/e/...output=csv`)

### Step 2: Configure the Website

1. Open `config.js` in a text editor
2. Replace `YOUR_GOOGLE_SHEETS_CSV_URL_HERE` with your CSV URL:

```javascript
CSV_URL: 'https://docs.google.com/spreadsheets/d/e/YOUR_SHEET_ID/pub?output=csv',
```

3. Save the file

### Step 3: Deploy to GitHub Pages (Free Hosting)

1. **Create a GitHub account** (if you don't have one) at [github.com](https://github.com)

2. **Create a new repository:**
   - Click "New repository"
   - Name: `WinnerTrack` (or any name)
   - Make it **Public**
   - Click "Create repository"

3. **Upload all files:**
   - Click "uploading an existing file"
   - Drag and drop all files:
     - `index.html`
     - `styles.css`
     - `script.js`
     - `config.js`
     - `README.md`
   - Click "Commit changes"

4. **Enable GitHub Pages:**
   - Go to **Settings** → **Pages**
   - Under "Source", select **"main"** branch
   - Click **Save**
   - Your site will be live at: `https://yourusername.github.io/WinnerTrack/`

### Step 4: Use It!

1. **Visit your website URL**
2. **Update Google Sheets** after each Sunday tournament
3. **Refresh the website** to see updated stats, rankings, and badges

---

## 📊 What Gets Auto-Calculated

### Individual Player Stats
- ✅ **Total Wins** - Counted automatically from appearances
- ✅ **Sundays Played** - Unique dates extracted
- ✅ **Win Rate** - Formula: `(Total Wins / Sundays Played) × 100`
- ✅ **Rank** - Sorted by wins, then win rate
- ✅ **Current Streak** - Consecutive Sundays with wins

### Pair Stats
- ✅ **Pair Wins** - Wins by each unique combination
- ✅ **Best Duo** - Pair with most wins together

### Badges (Auto-Assigned)
- 👑 **Sunday King** - Most total wins
- 🔗 **Best Duo** - Part of top-winning pair
- 🔥 **Win Streak** - 3+ consecutive Sunday wins
- 💎 **Consistent** - 75%+ win rate (min 5 Sundays)
- 🏋️ **Iron Man** - Most Sundays played

---

## 🎯 Flexible Tournament Handling

The system automatically handles:
- ✅ **1 tournament per Sunday** (2 winners)
- ✅ **2 tournaments per Sunday** (4 winners - typical)
- ✅ **3+ tournaments per Sunday** (6+ winners)
- ✅ **Variable tournaments** - Different counts each week

**You only enter:** Date, Tournament Number, 2 Winners
**Everything else calculates automatically!**

---

## 🛠️ Customization

### Change Badge Thresholds

Edit `config.js`:

```javascript
BADGES: {
    CONSISTENCY_WIN_RATE: 75,    // Win rate % for consistency badge
    CONSISTENCY_MIN_SUNDAYS: 5,  // Minimum Sundays played
    STREAK_THRESHOLD: 3          // Consecutive Sundays for streak badge
}
```

### Change Auto-Refresh Interval

Edit `config.js`:

```javascript
AUTO_REFRESH_INTERVAL: 60000,  // Milliseconds (60000 = 1 minute)
// Set to 0 to disable auto-refresh
```

### Change History Display

Edit `config.js`:

```javascript
MAX_HISTORY_ITEMS: 20,      // Initial items shown
HISTORY_LOAD_MORE: 10,      // Items loaded on "Load More" click
```

---

## 🎨 Customization - Colors & Styling

### Change Color Scheme

Edit `styles.css` - Update CSS variables at the top:

```css
:root {
    --primary: #FF6B35;        /* Main accent color */
    --secondary: #FFD700;      /* Gold color */
    --success: #10B981;        /* Success/green */
    /* ... modify any color */
}
```

### Common Customizations

**Change Trophy Animation Speed:**
```css
@keyframes bounce {
    /* Adjust animation duration */
}
```

**Modify Card Shadows:**
```css
.winner-card {
    box-shadow: 0 4px 12px var(--shadow);
}
```

---

## 📱 Responsive Design

Tested and optimized for:
- ✅ **Mobile:** 320px - 767px (iPhone, Android)
- ✅ **Tablet:** 768px - 1023px (iPad, tablets)
- ✅ **Desktop:** 1024px+ (laptops, monitors)
- ✅ **Large Screens:** 1440px+ (wide monitors)

**Mobile-First Approach:**
- Base styles for mobile
- Enhanced layouts for larger screens
- Touch-friendly buttons (44px minimum)
- No horizontal scrolling
- Readable text (16px minimum)

---

## 🔄 Updating Tournament Data

### Weekly Workflow

1. **After Sunday tournament, open Google Sheets**
2. **Add new row with all info:**
   ```
   Date: 15-02-2026
   Participants: Naveen,Vardhan,Kishore,Vivek,Ravi,Kumar,Sanjay,Prasad
   TournamentsPlayed: 2
   Teams: Team A, Team B
   Winners: 1-Naveen and Vivek, 2-Vardhan and Kishore
   ```
3. **Save the sheet** (auto-publishes)
4. **Visit website** - stats update automatically!

### Handling 1 or 3 Tournaments

**Just 1 tournament this Sunday?**
```
Date: 22-02-2026
Participants: Naveen,Vardhan,Kishore,Vivek
TournamentsPlayed: 1
Teams: Team A
Winners: 1-Vardhan and Naveen
```

**Had 3 tournaments?**
```
Date: 22-02-2026
Participants: Naveen,Vardhan,Kishore,Vivek,Ravi,Kumar,Sanjay,Prasad
TournamentsPlayed: 3
Teams: Team A, Team B, Team C
Winners: 1-Vardhan and Naveen, 2-Kishore and Vivek, 3-Ravi and Kumar
```

---

## 🐛 Troubleshooting

### Problem: Website shows "Failed to load data"

**Solution:**
1. Check that CSV URL in `config.js` is correct
2. Verify Google Sheet is published (File → Share → Publish to web)
3. Check browser console for error messages (F12 → Console)
4. Ensure Google Sheet has correct column headers

### Problem: Stats not updating

**Solution:**
1. Click **Refresh** button on website
2. Clear browser cache (Ctrl+Shift+R / Cmd+Shift+R)
3. Verify new data is in Google Sheet
4. Check "Published content & settings" in Google Sheets (should auto-update)

### Problem: Badges not appearing

**Solution:**
1. Check badge thresholds in `config.js`
2. Verify players meet criteria (e.g., 3+ week streak for streak badge)
3. Check browser console for JavaScript errors

### Problem: Mobile layout broken

**Solution:**
1. Check that viewport meta tag is in `index.html`
2. Clear browser cache
3. Test in different browsers (Chrome, Safari, Firefox)

---

## 🔒 Privacy & Data

- **No personal data collected** - Just tournament results
- **No analytics or tracking** - Pure static website
- **Google Sheets is the only data source** - Control who can view/edit
- **No backend servers** - Everything runs in the browser
- **No login required** - Public access (or make repo private for private access)

---

## 🚀 Advanced Features (Future)

Want to extend the app? Here are ideas:

- **Player Profiles** - Click name → detailed stats
- **Head-to-Head Comparison** - Compare any 2 players
- **Season/Quarter Grouping** - Track performance over time
- **Dark Mode Toggle** - User preference
- **Export PDF** - Print-friendly reports
- **Match Predictions** - Suggest next week's best pairs
- **Photos** - Add player avatars
- **Notifications** - Weekly email summaries

---

## 📄 License

This project is open-source and free to use, modify, and distribute.

---

## 🙋 Support

Have questions or issues?

1. Check the **Troubleshooting** section above
2. Review `PLAN.md` for technical details
3. Open browser console (F12) to check for errors
4. Verify Google Sheets CSV URL is correct

---

## 🎉 Credits

Built for Sunday Badminton Warriors who want to track dominance and ignite competition! 🏸🔥

**Tech Stack:**
- Vanilla HTML5, CSS3, JavaScript (ES6+)
- Google Sheets (data source)
- GitHub Pages (hosting)
- Zero dependencies, zero cost

---

**Ready to dominate? Start tracking your wins! 🏆**
