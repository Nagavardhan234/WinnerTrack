# 📊 CSV Format Guide - WinnerTrack

## Column Structure

Your Google Sheets should have these 5 columns:

| Column | Name | Description | Example |
|--------|------|-------------|---------|
| A | **Date** | Tournament date (DD-MM-YYYY) | `08-02-2026` |
| B | **Participants** | Comma-separated player names | `Kishore,Koushik,Naveen,Vardhan` |
| C | **Tournaments Played** | Number of tournaments on this date | `2` (or `0` if scheduled) |
| D | **Teams** | Optional team names | `Team A, Team B` |
| E | **Winners** | Winner pairs with tournament numbers | `1-Kishore and Nagarjuna, 2-Naveen and Vivek` |

---

## ✅ Valid Examples

### Single Tournament on One Date
```csv
Date,Participants,TournamentsPlayed,Teams,Winners
08-02-2026,"Kishore,Naveen,Vardhan,Vivek",1,"Team Elite","1-Kishore and Naveen"
```
**Result:** 1 tournament with Kishore & Naveen as winners

---

### Multiple Tournaments on Same Date
```csv
Date,Participants,TournamentsPlayed,Teams,Winners
08-02-2026,"Kishore,Koushik,Naveen,Vardhan,Vivek,Charan,Anil,Nagarjuna",2,"Team C, Team D","1-Kishore and Nagarjuna, 2-Naveen and Vivek"
```
**Result:** 2 tournaments:
- Tournament 1: Kishore & Nagarjuna
- Tournament 2: Naveen & Vivek

---

### Three Tournaments on Same Date
```csv
Date,Participants,TournamentsPlayed,Teams,Winners
15-02-2026,"Naveen,Vardhan,Kishore,Vivek,Ravi,Kumar,Anil,Charan",3,"Team A, Team B, Team C","1-Naveen and Kishore, 2-Vardhan and Vivek, 3-Ravi and Kumar"
```
**Result:** 3 tournaments on Feb 15, 2026

---

### Scheduled Tournament (No Winners Yet)
```csv
Date,Participants,TournamentsPlayed,Teams,Winners
22-02-2026,"Kishore,Rahul,Naveen,Vardhan,Vivek,Mahindra",0,"",""
```
**Result:** Scheduled tournament, shows in timeline as "Upcoming"

---

## 🎯 Important Rules

### Date Format
- ✅ **DD-MM-YYYY** (e.g., `08-02-2026` = Feb 8, 2026)
- ❌ Not MM-DD-YYYY (American format)

### Participants
- Separate names with commas: `Kishore,Naveen,Vardhan`
- No special characters in names
- Names will be auto-capitalized

### Tournaments Played
- `0` = Scheduled (no winners yet)
- `1` = One tournament completed
- `2` = Two tournaments completed
- `3+` = Multiple tournaments

### Winners Format
**Pattern:** `[Number]-[Name1] and [Name2], [Number]-[Name3] and [Name4]`

✅ **Accepted formats:**
- `1-Kishore and Nagarjuna`
- `1-Kishore & Nagarjuna`
- `1 - Kishore and Nagarjuna` (spaces OK)

✅ **Multiple winners:**
- `1-Kishore and Nagarjuna, 2-Naveen and Vivek`
- `1-Name1 and Name2, 2-Name3 and Name4, 3-Name5 and Name6`

❌ **Invalid formats:**
- `Kishore and Nagarjuna` (missing tournament number)
- `1-Kishore` (missing partner)
- `1: Kishore and Nagarjuna` (use `-` not `:`)

---

## 📋 Complete Example Sheet

```csv
Date,Participants,TournamentsPlayed,Teams,Winners
08-02-2026,"Kishore,Koushik,Naveen,Vardhan,Vivek,Charan,Anil,Nagarjuna",2,"Team C, Team D","1-Kishore and Nagarjuna, 2-Naveen and Vivek"
15-02-2026,"Kishore,Rahul,Naveen,Vardhan,Vivek,Mahindra,Anil,Nagarjuna",0,"",""
22-02-2026,"Naveen,Vardhan,Kishore,Vivek,Ravi,Kumar,Charan,Anil",2,"Team A, Team B","1-Vardhan and Kishore, 2-Naveen and Vivek"
01-03-2026,"Naveen,Vardhan,Kishore,Vivek,Koushik,Mahindra",1,"Team Elite","1-Naveen and Koushik"
08-03-2026,"Naveen,Vardhan,Kishore,Vivek,Ravi,Kumar,Anil,Charan",3,"Team A, Team B, Team C","1-Naveen and Kishore, 2-Vardhan and Vivek, 3-Ravi and Kumar"
```

---

## 🔄 How Partners Work

**✨ Dynamic Matching System**
- Partners change every tournament (manual/random matching)
- Same 2 players winning together multiple times is rare (earning **Dynamic Duo** badge becomes legendary!)
- **Free Agent** badge: Win with 5+ different partners

### Example Tracking:
```
Tournament 1: Kishore + Nagarjuna = Win
Tournament 2: Kishore + Naveen = Win  
Tournament 3: Kishore + Vivek = Loss
Tournament 4: Kishore + Nagarjuna = Win (paired again by luck!)
```
**Result:** Kishore has 2 wins with Nagarjuna, 1 win with Naveen → Dynamic Duo with Nagarjuna

---

## 🐛 Common Issues

### ❌ Issue: Winners not showing
**Cause:** Wrong format in Winners column  
**Fix:** Use pattern `1-Name1 and Name2, 2-Name3 and Name4`

### ❌ Issue: Participants showing wrong
**Cause:** Missing commas between names  
**Fix:** `Kishore,Naveen,Vardhan` (no spaces after commas is fine)

### ❌ Issue: Date parsing wrong
**Cause:** Using MM-DD-YYYY format  
**Fix:** Always use DD-MM-YYYY (e.g., `08-02-2026` for Feb 8)

### ❌ Issue: Scheduled tournaments not showing
**Cause:** Tournaments Played > 0 but no winners  
**Fix:** Set `0` in Tournaments Played column for scheduled events

---

## 📤 Publishing to Web

### Steps to Connect Google Sheets:
1. Open your Google Sheet
2. **File → Share → Publish to web**
3. Select **"Entire Document"** or specific sheet
4. Choose **"Comma-separated values (.csv)"** format
5. Click **Publish**
6. Copy the URL (looks like: `https://docs.google.com/spreadsheets/d/e/...`)
7. Paste in [config.js](config.js) → `CSV_URL`
8. Set `TEST_MODE: false`

---

## 🎮 Test Your Format

**Current Status:** ✅ TEST_MODE enabled (using sample data)

**To test with your data:**
1. Create Google Sheet with format above
2. Publish as CSV
3. Update `config.js`
4. Refresh the app

**Sample data shows:**
- 8 total tournaments across 5 dates
- Multiple tournaments per date working
- Dynamic partner matching tracked
- Scheduled tournament on Feb 15

---

**Last Updated:** February 14, 2026  
**Format Version:** 2.0 (Multi-tournament support)
