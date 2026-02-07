# 🏸 WinnerTrack - Sample Data for Testing

Use this data to test your Google Sheets setup:

## Sample Tournament Results

Copy and paste this into your Google Sheets:

```
Date,TournamentNo,Winner1,Winner2
2026-02-02,1,Vardhan,Naveen
2026-02-02,2,Kishore,Vivek
2026-02-09,1,Vardhan,Kishore
2026-02-09,2,Naveen,Vivek
2026-02-16,1,Vardhan,Naveen
2026-02-16,2,Kishore,Vivek
2026-02-23,1,Vardhan,Vivek
2026-03-02,1,Naveen,Kishore
2026-03-02,2,Vardhan,Vivek
2026-03-09,1,Vardhan,Naveen
2026-03-09,2,Kishore,Vivek
2026-03-09,3,Naveen,Vivek
2026-03-16,1,Vardhan,Kishore
2026-03-23,1,Naveen,Vivek
2026-03-30,1,Vardhan,Naveen
2026-03-30,2,Kishore,Vivek
```

## Expected Stats (After Loading Above Data)

### Individual Rankings:
1. **Vardhan** - 11 wins, 9 Sundays, 122% efficiency
2. **Naveen** - 9 wins, 8 Sundays
3. **Vivek** - 8 wins, 7 Sundays
4. **Kishore** - 8 wins, 7 Sundays

### Expected Badges:
- **Vardhan:** 👑 Sunday King, 🔥 Win Streak (won on multiple consecutive Sundays)
- **Naveen:** 🔗 Best Duo (with Vardhan), 💎 Consistent
- All players should have combinations of badges

### Best Duos:
1. Vardhan & Naveen - 5 wins
2. Kishore & Vivek - 4 wins
3. Vardhan & Vivek - 3 wins
4. Vardhan & Kishore - 3 wins
5. Naveen & Vivek - 3 wins

## Testing Scenarios

### ✅ Test 1: Normal Week (2 tournaments)
```
2026-04-06,1,Vardhan,Naveen
2026-04-06,2,Kishore,Vivek
```
Expected: 4 winners displayed in 2 cards

### ✅ Test 2: Single Tournament Week
```
2026-04-13,1,Vardhan,Kishore
```
Expected: 2 winners displayed in 1 card

### ✅ Test 3: Triple Tournament Week
```
2026-04-20,1,Vardhan,Naveen
2026-04-20,2,Kishore,Vivek
2026-04-20,3,Vardhan,Vivek
```
Expected: 6 winners displayed in 3 cards

## Quick Test Instructions

1. **Create Google Sheet** with the sample data above
2. **File → Share → Publish to web → CSV**
3. **Copy the CSV URL**
4. **Paste in `config.js`** (replace `YOUR_GOOGLE_SHEETS_CSV_URL_HERE`)
5. **Open `index.html`** in a browser
6. **Verify:**
   - ✅ Latest winners display correctly
   - ✅ Leaderboard shows 4 players with correct stats
   - ✅ Badges appear (Sunday King, Best Duo, etc.)
   - ✅ Pair performance shows top duos
   - ✅ Tournament history shows all matches
   - ✅ Motivation messages appear
   - ✅ Responsive on mobile (resize browser window)

## Local Testing (Without Google Sheets)

For quick local testing without setting up Google Sheets, you can temporarily modify `script.js`:

Add this test data at the top of the `loadData()` function:

```javascript
async function loadData() {
    try {
        showLoading();
        
        // TEMPORARY TEST DATA - Remove this after Google Sheets setup
        const testCSV = `Date,TournamentNo,Winner1,Winner2
2026-02-02,1,Vardhan,Naveen
2026-02-02,2,Kishore,Vivek
2026-02-09,1,Vardhan,Kishore
2026-02-09,2,Naveen,Vivek`;
        
        tournamentData = parseCSV(testCSV);
        calculateAllStats();
        renderUI();
        updateLastUpdatedTime();
        showContent();
        return;
        // END TEST DATA
        
        // ... rest of function
```

Then just open `index.html` directly in your browser!

**Remember to remove the test data once you connect real Google Sheets.**
