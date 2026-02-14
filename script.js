/**
 * WinnerTrack - Main JavaScript Logic
 * Handles data loading, calculation, and UI rendering
 */

// ===== Global State =====
let tournamentData = [];
let playerStats = [];
let pairStats = [];
let historyVisible = CONFIG.MAX_HISTORY_ITEMS;
let appState = 'loading'; // loading, empty, minimal, growing, established

// ===== Feature Unlock Thresholds =====
const FEATURE_GATES = {
    BASIC_RANKINGS: { minTournaments: 2, minPlayers: 2 },
    STREAK_TRACKING: { minTournaments: 3, minPlayers: 2 },
    DUO_TRACKING: { minTournaments: 3, minPlayers: 3 },
    FULL_BADGES: { minTournaments: 5, minPlayers: 4 },
    ADVANCED_FEATURES: { minTournaments: 10, minPlayers: 6 }
};

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    // Setup load more button listener
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', loadMoreHistory);
    }
    
    // Initial data load
    await loadData();
    
    // Setup auto-refresh if configured
    if (CONFIG.AUTO_REFRESH_INTERVAL > 0) {
        setInterval(loadData, CONFIG.AUTO_REFRESH_INTERVAL);
    }
}

// ===== Sample Test Data =====
// Used when TEST_MODE is enabled or when CORS prevents fetching from Google Sheets
const SAMPLE_DATA = `Date,Participants,TournamentsPlayed,Teams,Winners
15-02-2026,"Kishore,Rahul,Naveen,Vardhan,Vivek,Mahindra,Anil,Nagarjuna",0,"",""
08-02-2026,"Kishore,Koushik,Naveen,Vardhan,Vivek,Charan,Anil,Nagarjuna,Rahul,Mahindra,Ravi,Kumar",3,"Team A,Team B,Team C","1-Kishore and Nagarjuna, 2-Naveen and Vivek, 3-Ravi and Kumar"
22-01-2026,"Naveen,Vardhan,Kishore,Vivek,Ravi,Kumar,Charan,Anil",2,"Team A,Team B","1-Vardhan and Kishore, 2-Naveen and Vivek"
15-01-2026,"Naveen,Vardhan,Kishore,Vivek,Koushik,Mahindra",1,"Team Elite","1-Naveen and Koushik"
08-01-2026,"Naveen,Vardhan,Kishore,Vivek,Ravi,Kumar,Anil,Charan",2,"Team X,Team Y","1-Ravi and Charan, 2-Kishore and Anil"`;

// ===== Data Loading =====
async function loadData() {
    try {
        showLoading();
        
        let csvText;
        
        // Check if in test mode
        if (CONFIG.TEST_MODE) {
            // Use sample data for testing
            csvText = SAMPLE_DATA;
            console.log('🧪 Using sample test data (TEST_MODE enabled)');
        } else {
            // Validate CSV URL
            if (!CONFIG.CSV_URL || CONFIG.CSV_URL === 'YOUR_GOOGLE_SHEETS_CSV_URL_HERE') {
                throw new Error('Please configure your Google Sheets CSV URL in config.js');
            }
            
            // Fetch CSV data from Google Sheets
            try {
                const response = await fetch(CONFIG.CSV_URL + '&cachebust=' + Date.now());
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                csvText = await response.text();
                
                // Check if response is actually CSV data
                if (!csvText || csvText.trim().length === 0) {
                    throw new Error('Received empty data from Google Sheets');
                }
                
                console.log('✓ Data loaded from Google Sheets');
                
            } catch (fetchError) {
                if (fetchError.message.includes('Failed to fetch')) {
                    throw new Error('Cannot connect to Google Sheets due to CORS restrictions.\n\nYou are likely opening index.html directly from your file system.\n\n✅ SOLUTION: Run a local web server:\n\n1. Open terminal in project folder\n2. Run: python -m http.server 8000\n   (or: npx serve)\n3. Open: http://localhost:8000\n\nOR set TEST_MODE: true in config.js to use sample data.');
                } else if (fetchError.message.includes('HTTP 404')) {
                    throw new Error('Sheet not found (404). Please verify the CSV URL in config.js is correct and the sheet is published.');
                } else if (fetchError.message.includes('HTTP 403')) {
                    throw new Error('Access denied (403). Please make sure your Google Sheet is published to web and accessible.');
                } else {
                    throw fetchError;
                }
            }
        }
        
        tournamentData = parseCSV(csvText);
        
        // Calculate all stats
        calculateAllStats();
        
        // Render UI
        renderUI();
        
        // Update last updated time
        updateLastUpdatedTime();
        
        showContent();
        
    } catch (error) {
        console.error('Error loading data:', error);
        showError(error.message);
    }
}

// ===== CSV Parsing =====
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
        console.error('CSV has no data rows');
        return [];
    }
    
    const data = [];
    
    // Skip header row (line 0), start from line 1
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue; // Skip empty lines
        
        // Parse CSV line handling quoted fields with commas
        const values = parseCSVLine(line);
        
        if (values.length < 5) {
            console.warn(`Line ${i} has insufficient columns:`, values);
            continue;
        }
        
        // Column positions (regardless of header names):
        // 0: Date
        // 1: Participants  
        // 2: Tournaments Played
        // 3: Teams (optional)
        // 4: Winners
        
        const dateStr = values[0].trim();
        const participantsStr = values[1].trim();
        const tournamentsPlayed = parseInt(values[2]) || 0;
        const teams = values[3].split(',').map(t => t.trim()).filter(t => t);
        const winnersStr = values[4].trim();
        
        // Parse participants
        const participants = parseParticipants(participantsStr);
        
        // Determine if tournament is scheduled or completed
        const isScheduled = !winnersStr || winnersStr.length === 0;
        
        console.log('Parsing row:', { dateStr, participants, tournamentsPlayed, winnersStr, isScheduled });
        
        if (isScheduled) {
            // Add scheduled tournament entry
            data.push({
                date: normalizeDate(dateStr),
                state: 'scheduled',
                participants: participants,
                tournamentsPlayed: tournamentsPlayed,
                teams: teams,
                tournamentNo: null,
                winner1: null,
                winner2: null
            });
            console.log('Added scheduled tournament for', dateStr);
        } else {
            // Parse completed tournaments
            const tournaments = parseWinners(winnersStr, dateStr);
            
            console.log('Parsed tournaments:', tournaments);
            
            // Add all parsed tournaments with participant data
            tournaments.forEach(tournament => {
                data.push({
                    ...tournament,
                    state: 'completed',
                    participants: participants,
                    tournamentsPlayed: tournamentsPlayed,
                    teams: teams
                });
            });
        }
    }
    
    console.log('Total tournaments parsed:', data.length);
    
    // Sort by date descending (newest first)
    data.sort((a, b) => parseDate(b.date) - parseDate(a.date));
    
    return data;
}

function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            values.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    
    values.push(current);
    return values;
}

function parseParticipants(participantsStr) {
    if (!participantsStr || participantsStr.trim().length === 0) {
        return [];
    }
    
    return participantsStr
        .split(',')
        .map(p => p.trim())
        .map(p => capitalizeWords(p))
        .filter(p => p.length > 0);
}

function parseWinners(winnersStr, date) {
    const tournaments = [];
    
    // Split by tournament number patterns: "1-..., 2-..., 3-..."
    // Handle spaces around dash and commas: "1-name, 2-name"
    const parts = winnersStr.split(/,\s*(?=\d+\s*-)/); 
    
    console.log(`📋 Parsing ${parts.length} tournament(s) from: "${winnersStr}"`);
    
    parts.forEach((part, index) => {
        // Match tournament number with flexible spacing: "1-name" or "1 - name" or "1- name"
        const match = part.match(/(\d+)\s*-\s*(.+)/);
        if (match) {
            const tournamentNo = parseInt(match[1]);
            const winnersText = match[2].trim();
            
            // Parse winner names: "Kishore and Nagarjuna" or "Naveen & Vardhan"
            const winners = parseWinnerPair(winnersText);
            
            if (winners.length === 2) {
                tournaments.push({
                    date: normalizeDate(date),
                    tournamentNo: tournamentNo,
                    winner1: winners[0],
                    winner2: winners[1]
                });
                console.log(`✅ Tournament ${tournamentNo}: ${winners[0]} & ${winners[1]}`);
            } else {
                console.warn(`⚠️ Could not parse 2 winners from: "${winnersText}" (got ${winners.length})`);
            }
        } else {
            console.warn(`⚠️ Could not match tournament pattern in: "${part}"`);
        }
    });
    
    console.log(`✅ Total tournaments parsed: ${tournaments.length}`);
    return tournaments;
}

function parseWinnerPair(text) {
    // Handle formats: "Name1 and Name2", "Name1 & Name2", "Name1,Name2"
    const separators = [' and ', ' & ', ','];
    
    for (const sep of separators) {
        if (text.includes(sep)) {
            return text.split(sep)
                .map(name => name.trim())
                .map(name => capitalizeWords(name))
                .filter(name => name.length > 0);
        }
    }
    
    return [];
}

function capitalizeWords(str) {
    return str.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

/**
 * Extract winner pair from various formats:
 * - "Kishore and Nagarjuna"
 * - "Kishore,Nagarjuna"
 * - "1-Kishore and nagarjuna" (strips number prefix)
 * - "Kishore & Nagarjuna"
 */
function extractWinnerPair(winnersStr) {
    if (!winnersStr || winnersStr.trim() === '') return [null, null];
    
    // Remove tournament number prefix like "1-" or "2-"
    let cleaned = winnersStr.replace(/^\d+-?\s*/, '').trim();
    
    // Try different separators
    let names = [];
    if (cleaned.includes(' and ')) {
        names = cleaned.split(' and ');
    } else if (cleaned.includes('&')) {
        names = cleaned.split('&');
    } else if (cleaned.includes(',')) {
        names = cleaned.split(',');
    } else {
        // Try to split by whitespace if exactly 2 words
        const words = cleaned.split(/\s+/);
        if (words.length === 2) {
            names = words;
        } else {
            // Fallback: assume format is "FirstName LastName"
            names = [cleaned];
        }
    }
    
    // Clean and capitalize
    names = names.map(n => capitalizeWords(n.trim())).filter(n => n.length > 0);
    
    // Return pair (or nulls if incomplete)
    return [
        names[0] || null,
        names[1] || null
    ];
}

function normalizeDate(dateStr) {
    // FIX BUG #34: Standardize on DD-MM-YYYY format explicitly
    // Handle formats: DD-MM-YYYY, MM-DD-YYYY, YYYY-MM-DD
    const parts = dateStr.split(/[-\/]/);
    
    if (parts.length === 3) {
        // If first part is 4 digits, it's YYYY-MM-DD
        if (parts[0].length === 4) {
            // Convert YYYY-MM-DD to DD-MM-YYYY
            return `${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[0]}`;
        }
        // If third part is 4 digits, assume DD-MM-YYYY (European format)
        if (parts[2].length === 4) {
            return `${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[2]}`;
        }
    }
    
    return dateStr;
}

function parseDate(dateStr) {
    // FIX BUG #34: Parse DD-MM-YYYY format correctly
    const parts = dateStr.split(/[-\/]/);
    if (parts.length === 3) {
        // Check if format is DD-MM-YYYY
        if (parts[2].length === 4) {
            // DD-MM-YYYY format
            return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        }
        // Fallback to YYYY-MM-DD
        return new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
    }
    return new Date(dateStr);
}

// ===== Tournament State & Date Utilities =====

/**
 * Get current tournament state relative to today
 * @param {string} tournamentDate - Date string in YYYY-MM-DD format
 * @returns {Object} { date, daysDiff, isToday, isPast, isFuture, daysUntil, daysAgo }
 */
function getTournamentDateState(tournamentDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tDate = parseDate(tournamentDate);
    tDate.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.floor((tDate - today) / (1000 * 60 * 60 * 24));
    
    return {
        date: tournamentDate,
        daysDiff: daysDiff,
        isToday: daysDiff === 0,
        isPast: daysDiff < 0,
        isFuture: daysDiff > 0,
        daysUntil: daysDiff > 0 ? daysDiff : 0,
        daysAgo: daysDiff < 0 ? Math.abs(daysDiff) : 0
    };
}

/**
 * Get appropriate message for tournament based on state and date
 * @param {Object} tournament - Tournament object with state and date
 * @returns {Object} { title, subtitle, status, statusClass }
 */
function getTournamentStateMessage(tournament) {
    const dateState = getTournamentDateState(tournament.date);
    
    if (tournament.state === 'scheduled') {
        if (dateState.isToday) {
            return {
                title: "🎾 Tournament Day is TODAY!",
                subtitle: "Good luck to all participants!",
                status: "Playing now",
                statusClass: "status-today"
            };
        } else if (dateState.isFuture) {
            return {
                title: "📅 Upcoming Tournament",
                subtitle: `${dateState.daysUntil} day${dateState.daysUntil === 1 ? '' : 's'} until game day`,
                status: "Scheduled",
                statusClass: "status-scheduled"
            };
        } else {
            // Past but no results
            return {
                title: "⏳ Awaiting Results",
                subtitle: "Tournament completed, waiting for data update",
                status: "Results pending",
                statusClass: "status-pending"
            };
        }
    } else {
        // Completed tournament
        if (dateState.isToday) {
            return {
                title: "🏆 Today's Champions!",
                subtitle: "Fresh off the court",
                status: "Completed today",
                statusClass: "status-today-completed"
            };
        } else if (dateState.daysAgo <= 7) {
            return {
                title: "🏆 Recent Winners",
                subtitle: `${dateState.daysAgo} day${dateState.daysAgo === 1 ? '' : 's'} ago`,
                status: "Recent",
                statusClass: "status-recent"
            };
        } else {
            return {
                title: "🏆 Winners",
                subtitle: formatDate(tournament.date),
                status: "Completed",
                statusClass: "status-completed"
            };
        }
    }
}

/**
 * Check if we should show participant list for this date
 * @param {Object} dateState - Date state from getTournamentDateState
 * @param {Object} tournament - Tournament object
 * @returns {boolean}
 */
function shouldShowParticipants(dateState, tournament) {
    // Show for today's tournaments
    if (dateState.isToday) return true;
    
    // Show for scheduled future tournaments
    if (tournament.state === 'scheduled' && dateState.isFuture) return true;
    
    // Show for recent completed tournaments (within 7 days)
    if (tournament.state === 'completed' && dateState.daysAgo <= 7) return true;
    
    return false;
}

// ===== Stats Calculation =====
function calculateAllStats() {
    if (tournamentData.length === 0) {
        playerStats = [];
        pairStats = [];
        appState = 'empty';
        return;
    }
    
    // Filter only completed tournaments for statistics
    const completedTournaments = tournamentData.filter(t => t.state === 'completed');
    
    // FIX BUG #35: Allow showing scheduled tournaments even without completed ones
    if (completedTournaments.length === 0) {
        playerStats = [];
        pairStats = [];
        appState = 'scheduled-only'; // New state to distinguish from completely empty
        return;
    }
    
    // Determine app state based on completed tournament count
    const uniquePlayers = new Set();
    completedTournaments.forEach(t => {
        if (t.winner1) uniquePlayers.add(t.winner1);
        if (t.winner2) uniquePlayers.add(t.winner2);
    });
    
    const tournamentCount = completedTournaments.length;
    const playerCount = uniquePlayers.size;
    
    if (tournamentCount === 1) {
        appState = 'first-win';
    } else if (tournamentCount <= 3) {
        appState = 'minimal';
    } else if (tournamentCount <= 10) {
        appState = 'growing';
    } else {
        appState = 'established';
    }
    
    // Calculate individual player stats using only completed tournaments
    playerStats = calculatePlayerStats(completedTournaments);
    
    // Calculate pair stats using only completed tournaments
    pairStats = calculatePairStats(completedTournaments);
}

function calculatePlayerStats(completedTournaments = tournamentData) {
    const playersMap = new Map();
    
    // Get total unique Sundays for participation rate calculation
    const allSundaysSet = new Set(completedTournaments.map(t => t.date));
    const totalUniqueSundays = allSundaysSet.size;
    
    // First pass: Count ALL tournament participations for each player
    completedTournaments.forEach(tournament => {
        const allParticipants = tournament.participants || [];
        
        allParticipants.forEach(participant => {
            if (!playersMap.has(participant)) {
                playersMap.set(participant, {
                    name: participant,
                    totalWins: 0,
                    totalMatches: 0,
                    sundays: new Set(),
                    tournaments: [],
                    allTournaments: [],
                    partners: new Map(),
                    winDates: []
                });
            }
            
            const stats = playersMap.get(participant);
            stats.totalMatches++;
            stats.sundays.add(tournament.date);
            stats.allTournaments.push({
                date: tournament.date,
                tournamentNo: tournament.tournamentNo,
                won: false
            });
        });
        
        // Second pass: Track wins and initialize winners if not in participants
        const winners = [tournament.winner1, tournament.winner2].filter(w => w);
        winners.forEach(winner => {
            // FIX BUG #6: Initialize winner if not already in playersMap
            if (!playersMap.has(winner)) {
                playersMap.set(winner, {
                    name: winner,
                    totalWins: 0,
                    totalMatches: 0,
                    sundays: new Set(),
                    tournaments: [],
                    allTournaments: [],
                    partners: new Map(),
                    winDates: []
                });
            }
            
            const stats = playersMap.get(winner);
            
            // If winner wasn't in participants, add this match
            if (!tournament.participants || !tournament.participants.includes(winner)) {
                stats.totalMatches++;
                stats.allTournaments.push({
                    date: tournament.date,
                    tournamentNo: tournament.tournamentNo,
                    won: true
                });
            } else {
                // Mark as won in existing allTournaments entry
                const lastIndex = stats.allTournaments.length - 1;
                if (lastIndex >= 0) {
                    stats.allTournaments[lastIndex].won = true;
                }
            }
            
            stats.totalWins++;
            stats.sundays.add(tournament.date);
            stats.winDates.push(tournament.date);
            stats.tournaments.push({
                date: tournament.date,
                tournamentNo: tournament.tournamentNo,
                partner: winners.find(w => w !== winner)
            });
            
            // Track partners
            const partner = winners.find(p => p !== winner);
            if (partner) {
                stats.partners.set(partner, (stats.partners.get(partner) || 0) + 1);
            }
        });
    });
    
    // Convert to array and calculate enhanced stats
    const statsArray = Array.from(playersMap.values()).map(player => {
        const sundaysPlayed = player.sundays.size;
        const totalMatches = player.totalMatches;
        const totalWins = player.totalWins;
        const totalLosses = totalMatches - totalWins;
        
        // Calculate win rate based on matches, not Sundays
        const winRate = totalMatches > 0 ? (totalWins / totalMatches * 100) : 0;
        
        // Calculate participation rate
        const participationRate = totalUniqueSundays > 0 
            ? Math.round((sundaysPlayed / totalUniqueSundays) * 100) 
            : 0;
        
        // Calculate streaks (both current and best)
        const streaks = calculateStreaks(player.tournaments);
        
        // FIX BUG #10: Filter out scheduled tournaments (only use completed with results)
        const completedTournamentsOnly = player.allTournaments.filter(t => t.won !== undefined);
        
        // Calculate recent form (last 5 completed tournaments only)
        const form = calculateRecentForm(completedTournamentsOnly, 5);
        
        // FIX BUG #15: Sort winDates descending (newest first) before using
        const sortedWinDates = [...player.winDates].sort((a, b) => parseDate(b) - parseDate(a));
        
        // Days since last win
        const daysSinceWin = sortedWinDates.length > 0 
            ? Math.floor((new Date() - parseDate(sortedWinDates[0])) / (1000 * 60 * 60 * 24))
            : null;
        
        return {
            ...player,
            totalMatches,
            totalLosses,
            sundaysPlayed,
            winRate: Math.round(winRate * 10) / 10,
            participationRate,
            currentStreak: streaks.current,
            bestStreak: streaks.best,
            last5Form: form.display,
            last5Tournaments: form.tournaments,
            last5WinRate: form.winRate,
            daysSinceLastWin: daysSinceWin,
            lastWinDate: sortedWinDates[0] || null,
            previousRank: null,
            rankChange: 0,
            badges: []
        };
    });
    
    // Sort by total wins, then by total matches (fewer is better as tiebreaker)
    statsArray.sort((a, b) => {
        if (b.totalWins !== a.totalWins) {
            return b.totalWins - a.totalWins;
        }
        return a.totalMatches - b.totalMatches;
    });
    
    // FIX BUG #8: Load previous ranks from localStorage
    const previousRanks = loadPreviousRanks();
    
    // Assign ranks and calculate milestones
    statsArray.forEach((player, index) => {
        player.rank = index + 1;
        
        // FIX BUG #8: Set previousRank and calculate change
        if (previousRanks[player.name]) {
            player.previousRank = previousRanks[player.name];
            player.rankChange = previousRanks[player.name] - player.rank;
        } else {
            player.previousRank = null;
            player.rankChange = 0;
        }
        
        // FIX BUG #26: Calculate next milestone with tie handling
        if (index > 0) {
            const playerAbove = statsArray[index - 1];
            const winsNeeded = playerAbove.totalWins - player.totalWins + 1;
            
            if (winsNeeded > 0) {
                player.nextMilestone = {
                    type: 'rank',
                    targetRank: playerAbove.rank,
                    targetName: playerAbove.name,
                    winsNeeded: winsNeeded,
                    message: `${winsNeeded} win${winsNeeded === 1 ? '' : 's'} away from #${playerAbove.rank}`
                };
            } else {
                // Tied with player above
                player.nextMilestone = {
                    type: 'tie',
                    message: `Tied at ${player.totalWins} wins - need fewer matches to rank higher`
                };
            }
        }
    });
    
    // Assign badges
    assignBadges(statsArray);
    
    // FIX BUG #8: Save current ranks for next comparison
    savePreviousRanks(statsArray);
    
    return statsArray;
}

// FIX BUG #8: Helper functions for rank persistence
function loadPreviousRanks() {
    try {
        const stored = localStorage.getItem('winnertrack_ranks');
        return stored ? JSON.parse(stored) : {};
    } catch (e) {
        console.error('Failed to load previous ranks:', e);
        return {};
    }
}

function savePreviousRanks(statsArray) {
    try {
        const ranks = {};
        statsArray.forEach(player => {
            ranks[player.name] = player.rank;
        });
        localStorage.setItem('winnertrack_ranks', JSON.stringify(ranks));
    } catch (e) {
        console.error('Failed to save ranks:', e);
    }
}

// Helper function to calculate recent form
function calculateRecentForm(allTournaments, count = 5) {
    const sorted = [...allTournaments].sort((a, b) => 
        new Date(b.date) - new Date(a.date)
    );
    
    const recent = sorted.slice(0, count);
    const display = recent.map(t => t.won ? 'W' : 'L').join('-');
    const wins = recent.filter(t => t.won).length;
    const winRate = recent.length > 0 ? Math.round((wins / recent.length) * 100) : 0;
    
    return {
        display,
        tournaments: recent,
        wins,
        losses: recent.length - wins,
        winRate
    };
}

function calculatePairStats(completedTournaments = tournamentData) {
    const pairsMap = new Map();
    
    completedTournaments.forEach(tournament => {
        const pair = [tournament.winner1, tournament.winner2].sort().join(' & ');
        
        if (!pairsMap.has(pair)) {
            pairsMap.set(pair, {
                pair,
                wins: 0,
                lastWin: tournament.date
            });
        }
        
        const stats = pairsMap.get(pair);
        stats.wins++;
        
        // Update last win if this is more recent
        if (new Date(tournament.date) > new Date(stats.lastWin)) {
            stats.lastWin = tournament.date;
        }
    });
    
    // Convert to array and sort by wins
    const pairsArray = Array.from(pairsMap.values());
    pairsArray.sort((a, b) => b.wins - a.wins);
    
    return pairsArray;
}

// Helper function to calculate both current and best streaks
// FIX BUG #12: Now considers all tournament participations, not just wins
function calculateStreaks(tournaments) {
    if (tournaments.length === 0) return { current: 0, best: 0 };
    
    // Get unique Sundays where player won
    const sundays = [...new Set(tournaments.map(t => t.date))];
    sundays.sort((a, b) => new Date(b) - new Date(a));
    
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;
    let previousSunday = null;
    
    for (let i = 0; i < sundays.length; i++) {
        const currentSunday = new Date(sundays[i]);
        
        if (i === 0) {
            currentStreak = 1;
            tempStreak = 1;
            previousSunday = currentSunday;
            bestStreak = 1;
        } else {
            const daysDiff = (previousSunday - currentSunday) / (1000 * 60 * 60 * 24);
            
            // FIX BUG #14: More lenient range for week detection (5-9 days)
            if (daysDiff >= 5 && daysDiff <= 9) {
                if (currentStreak > 0) currentStreak++;
                tempStreak++;
                bestStreak = Math.max(bestStreak, tempStreak);
                previousSunday = currentSunday;
            } else {
                currentStreak = 0;
                bestStreak = Math.max(bestStreak, tempStreak);
                tempStreak = 1;
                previousSunday = currentSunday;
            }
        }
    }
    
    bestStreak = Math.max(bestStreak, tempStreak, currentStreak);
    
    return { current: currentStreak, best: bestStreak };
}

// Old function kept for compatibility
function calculateStreak(tournaments) {
    if (tournaments.length === 0) return 0;
    
    // Get unique Sundays in chronological order (newest first)
    const sundays = [...new Set(tournaments.map(t => t.date))];
    sundays.sort((a, b) => new Date(b) - new Date(a));
    
    let streak = 0;
    let previousSunday = null;
    
    for (const sunday of sundays) {
        if (previousSunday === null) {
            streak = 1;
            previousSunday = new Date(sunday);
        } else {
            const currentSunday = new Date(sunday);
            const daysDiff = (previousSunday - currentSunday) / (1000 * 60 * 60 * 24);
            
            // Check if consecutive Sundays (6-8 days apart)
            if (daysDiff >= 6 && daysDiff <= 8) {
                streak++;
                previousSunday = currentSunday;
            } else {
                break;
            }
        }
    }
    
    return streak;
}

function assignBadges(statsArray) {
    if (statsArray.length === 0) return;
    
    const maxWins = statsArray[0].totalWins;
    const maxSundays = Math.max(...statsArray.map(p => p.sundaysPlayed));
    
    statsArray.forEach(player => {
        const badges = [];
        
        // ===== ACHIEVEMENT BADGES =====
        
        // 1. Sunday King - Most total wins
        if (player.totalWins === maxWins && maxWins > 0) {
            badges.push({ icon: '👑', name: 'Sunday King', tier: 'legendary' });
        }
        
        // 2. Golden Gloves - 10+ wins
        if (player.totalWins >= CONFIG.BADGES.GOLDEN_GLOVES_WINS) {
            badges.push({ icon: '🥇', name: 'Golden Gloves', tier: 'epic' });
        }
        
        // 3. Consistency Crown - 75%+ win rate (5+ Sundays)
        if (player.winRate >= CONFIG.BADGES.CONSISTENCY_WIN_RATE && 
            player.sundaysPlayed >= CONFIG.BADGES.CONSISTENCY_MIN_SUNDAYS) {
            badges.push({ icon: '💎', name: 'Consistency Crown', tier: 'rare' });
        }
        
        // 4. Flame Keeper - 3+ consecutive Sundays
        if (player.currentStreak >= CONFIG.BADGES.STREAK_THRESHOLD && 
            player.currentStreak < CONFIG.BADGES.LIGHTNING_STREAK) {
            badges.push({ icon: '🔥', name: `${player.currentStreak}-Week Streak`, tier: 'rare' });
        }
        
        // 5. Iron Man - Most Sundays played (10+ required)
        if (player.sundaysPlayed === maxSundays && 
            maxSundays >= CONFIG.BADGES.IRON_MAN_MIN_SUNDAYS) {
            badges.push({ icon: '🏋️', name: 'Iron Man', tier: 'epic' });
        }
        
        // ===== PARTNERSHIP BADGES =====
        
        // 6. Dynamic Duo - Part of best pair
        if (pairStats.length > 0) {
            const bestPair = pairStats[0].pair.split(' & ');
            if (bestPair.includes(player.name) && pairStats[0].wins >= 3) {
                badges.push({ icon: '🔗', name: 'Dynamic Duo', tier: 'rare' });
            }
        }
        
        // 7. Universal Partner - Won with 5+ different partners
        const uniquePartners = player.partners ? player.partners.size : 0;
        if (uniquePartners >= CONFIG.BADGES.UNIVERSAL_PARTNER_COUNT) {
            badges.push({ icon: '🤝', name: 'Universal Partner', tier: 'rare' });
        }
        
        // 8. Perfect Chemistry - 100% win rate with one partner (3+ games)
        if (player.partners) {
            for (const [partner, wins] of player.partners.entries()) {
                const partnerTournaments = player.tournaments.filter(t => t.partner === partner).length;
                if (wins >= CONFIG.BADGES.PERFECT_CHEMISTRY_MIN && wins === partnerTournaments) {
                    badges.push({ icon: '💫', name: 'Perfect Chemistry', tier: 'epic' });
                    break;
                }
            }
        }
        
        // 9. Duo Specialist - 70%+ wins with same partner
        if (player.partners && player.partners.size > 0) {
            const topPartner = [...player.partners.entries()].sort((a, b) => b[1] - a[1])[0];
            const partnerWinRate = (topPartner[1] / player.totalWins) * 100;
            if (partnerWinRate >= CONFIG.BADGES.DUO_SPECIALIST_RATE && player.totalWins >= 5) {
                badges.push({ icon: '🎯', name: 'Duo Specialist', tier: 'rare' });
            }
        }
        
        // ===== STREAK BADGES =====
        
        // 10. Lightning Bolt - 5+ consecutive Sundays
        if (player.currentStreak >= CONFIG.BADGES.LIGHTNING_STREAK && 
            player.currentStreak < CONFIG.BADGES.UNSTOPPABLE_STREAK) {
            badges.push({ icon: '⚡', name: 'Lightning Bolt', tier: 'epic' });
        }
        
        // 11. Unstoppable - 7+ consecutive Sundays
        if (player.currentStreak >= CONFIG.BADGES.UNSTOPPABLE_STREAK) {
            badges.push({ icon: '🌪️', name: 'Unstoppable', tier: 'legendary' });
        }
        
        // 12. Rising Star - Won last 3 after losing period
        if (player.tournaments.length >= 6) {
            const recentThree = player.tournaments.slice(0, 3).map(t => t.date);
            const uniqueRecentDates = [...new Set(recentThree)];
            if (uniqueRecentDates.length === 3 && player.currentStreak >= 3) {
                const olderTournaments = player.tournaments.slice(3);
                const hasGap = olderTournaments.length > 0;
                if (hasGap) {
                    badges.push({ icon: '📈', name: 'Rising Star', tier: 'rare' });
                }
            }
        }
        
        // 13. Comeback Kid - Won after 3+ Sunday drought (handled in tournament data)
        
        // ===== VOLUME BADGES =====
        
        // 14. Marathon Runner - Played 20+ Sundays
        if (player.sundaysPlayed >= CONFIG.BADGES.MARATHON_SUNDAYS) {
            badges.push({ icon: '🏃', name: 'Marathon Runner', tier: 'epic' });
        }
        
        // 15. Triple Threat - Won 3+ tournaments in one Sunday
        if (player.tournaments.length > 0) {
            const tournamentsByDate = {};
            player.tournaments.forEach(t => {
                tournamentsByDate[t.date] = (tournamentsByDate[t.date] || 0) + 1;
            });
            const maxInOneDay = Math.max(...Object.values(tournamentsByDate));
            if (maxInOneDay >= CONFIG.BADGES.TRIPLE_THREAT_SAME_DAY) {
                badges.push({ icon: '🎪', name: 'Triple Threat', tier: 'rare' });
            }
        }
        
        // 16. Perfect Attendance - Played every Sunday for 8+ weeks (needs consecutive check)
        if (player.sundaysPlayed >= CONFIG.BADGES.PERFECT_ATTENDANCE_WEEKS) {
            // Simplified: just check if played many Sundays
            badges.push({ icon: '📅', name: 'Perfect Attendance', tier: 'rare' });
        }
        
        // 17. Morning Glory - Best win rate in Tournament #1 (needs global comparison)
        
        // ===== STATISTICAL EXCELLENCE =====
        
        // 18. Efficiency Expert - Highest win rate
        if (player.rank === 1 && player.winRate > 0) {
            // Already has Sunday King, could add if different metric
        }
        
        // 19. Precision Player - 90%+ win rate (5+ Sundays)
        if (player.winRate >= CONFIG.BADGES.PRECISION_WIN_RATE && 
            player.sundaysPlayed >= CONFIG.BADGES.EFFICIENCY_MIN_SUNDAYS) {
            badges.push({ icon: '🎯', name: 'Precision Player', tier: 'legendary' });
        }
        
        // 20. Triple Crown - Most wins + Most Sundays + Best Duo
        const hasSundayKing = badges.some(b => b.name === 'Sunday King');
        const hasIronMan = badges.some(b => b.name === 'Iron Man');
        const hasDynamicDuo = badges.some(b => b.name === 'Dynamic Duo');
        if (hasSundayKing && hasIronMan && hasDynamicDuo) {
            badges.push({ icon: '🏆', name: 'Triple Crown', tier: 'legendary' });
        }
        
        // 21. Balanced Champion - 45-55% win rate with high volume
        if (player.winRate >= CONFIG.BADGES.BALANCED_WIN_RATE_MIN && 
            player.winRate <= CONFIG.BADGES.BALANCED_WIN_RATE_MAX && 
            player.totalWins >= CONFIG.BADGES.BALANCED_MIN_WINS) {
            badges.push({ icon: '⚖️', name: 'Balanced Champion', tier: 'rare' });
        }
        
        // ===== SPECIAL BADGES =====
        
        // 22. Lucky 7 - Exactly 7 wins
        if (player.totalWins === 7) {
            badges.push({ icon: '🎰', name: 'Lucky 7', tier: 'rare' });
        }
        
        // 23. First Blood - Won the very first tournament
        // FIX BUG #27: Sort tournaments chronologically (oldest first) before checking
        if (tournamentData.length > 0) {
            const sortedChronologically = [...tournamentData].sort((a, b) => parseDate(a.date) - parseDate(b.date));
            const firstTournament = sortedChronologically[0];
            if (firstTournament.state === 'completed' && 
                (firstTournament.winner1 === player.name || firstTournament.winner2 === player.name)) {
                badges.push({ icon: '🌟', name: 'First Blood', tier: 'rare' });
            }
        }
        
        // 24. Legend - 50+ wins
        if (player.totalWins >= CONFIG.BADGES.LEGEND_WINS) {
            badges.push({ icon: '🐉', name: 'Legend', tier: 'legendary' });
        }
        
        // 25. Free Agent - Never won with same partner twice (5+ wins)
        // More common in dynamic matching, but still impressive!
        if (player.partners && player.partners.size > 0 && player.totalWins >= CONFIG.BADGES.FREE_AGENT_MIN_WINS) {
            const maxPartnerWins = Math.max(...player.partners.values());
            if (maxPartnerWins === 1 && player.partners.size >= 5) {
                badges.push({ 
                    icon: '🦅', 
                    name: 'Free Agent', 
                    tier: 'epic',
                    subtitle: `${player.partners.size} different partners`
                });
            }
        }
        
        // 26. Giant Slayer - Most wins against current #1 (needs head-to-head tracking)
        
        // 27. Phoenix - Dropped out of top 3, returned (needs rank history)
        
        player.badges = badges;
    });
}

// ===== UI Rendering =====
function renderUI() {
    // Handle different app states
    if (appState === 'empty') {
        showWelcome();
        return;
    }
    
    if (appState === 'first-win') {
        renderFirstWinExperience();
        showFirstWinModal();
        return;
    }
    
    // Render all components
    renderLatestWinners();
    
    // Render participants if feature is enabled
    if (CONFIG.FEATURE_TOGGLES?.SHOW_PARTICIPANTS !== false) {
        renderParticipants();
    }
    
    renderMotivationMessages();
    
    // Progressive feature rendering
    if (appState === 'minimal' || appState === 'growing') {
        renderUnlockProgress();
    }
    
    // Only show rankings if unlocked
    const rankingsUnlock = checkFeatureUnlock('BASIC_RANKINGS');
    if (rankingsUnlock.unlocked) {
        renderLeaderboard();
    }
    
    // Only show pairs if unlocked
    const duoUnlock = checkFeatureUnlock('DUO_TRACKING');
    if (duoUnlock.unlocked) {
        renderPairPerformance();
    } else {
        hideSection('pairPerformance');
    }
    
    // Render timeline if feature is enabled
    if (CONFIG.FEATURE_TOGGLES?.SHOW_TIMELINE !== false) {
        renderTimeline();
    }
    
    renderTournamentHistory();
}

function renderLatestWinners() {
    const container = document.getElementById('latestWinnersGrid');
    const dateElement = document.getElementById('latestDate');
    const sectionTitleElement = document.querySelector('.latest-winners .section-title');
    
    if (tournamentData.length === 0) {
        container.innerHTML = '<p class="section-subtitle">No tournament data available yet.</p>';
        if (dateElement) dateElement.textContent = '--';
        return;
    }
    
    // Get latest date entry
    const latestEntry = tournamentData[0];
    const latestDate = latestEntry.date;
    const dateState = getTournamentDateState(latestDate);
    const stateMessage = getTournamentStateMessage(latestEntry);
    
    // Update section title and date based on state
    if (sectionTitleElement) sectionTitleElement.textContent = stateMessage.title;
    if (dateElement) dateElement.textContent = stateMessage.subtitle;
    
    // FIX: Show "Looking for Winners" block for scheduled tournaments
    if (latestEntry.state === 'scheduled' || !latestEntry.winner1 || !latestEntry.winner2) {
        let title, subtitle, icon;
        if (dateState.isToday) {
            title = '🏸 Tournament in Progress';
            subtitle = 'Awaiting today\'s champions';
            icon = '⏳';
        } else if (dateState.isFuture) {
            title = '📅 Upcoming Tournament';
            subtitle = `Looking for winners in ${dateState.daysUntil} day${dateState.daysUntil === 1 ? '' : 's'}`;
            icon = '🔮';
        } else {
            title = '⏳ Results Pending';
            subtitle = 'Waiting for tournament results to be updated';
            icon = '📋';
        }
        
        container.innerHTML = `
            <div class="looking-for-winners-block">
                <div class="looking-icon-large">${icon}</div>
                <h3 class="looking-title">${title}</h3>
                <p class="looking-subtitle">${subtitle}</p>
                <div class="looking-date-badge">${formatDate(latestDate)}</div>
                ${latestEntry.participants && latestEntry.participants.length > 0 ? `
                    <div class="looking-participants-count">
                        🏸 ${latestEntry.participants.length} players registered
                    </div>
                ` : ''}
            </div>
        `;
        return;
    }
    
    // Render completed tournament winners
    const latestTournaments = tournamentData.filter(
        t => t.date === latestDate && t.state === 'completed'
    );
    
    if (latestTournaments.length === 0) {
        container.innerHTML = renderScheduledTournament(latestEntry, dateState);
        return;
    }
    
    container.innerHTML = latestTournaments.map((tournament, index) => `
        <div class="winner-card ${dateState.isToday ? 'today-winner' : ''}">
            <div class="trophy">🏆</div>
            <div class="tournament-label">Tournament ${tournament.tournamentNo} Winners</div>
            <div class="winner-names">✨ ${tournament.winner1} & ${tournament.winner2} ✨</div>
            <div class="celebration-text">
                ${dateState.isToday ? '🎊 Fresh Champions! 🎊' : '🎊 Champions! 🎊'}
            </div>
            ${dateState.isToday ? '<div class="today-badge">Today</div>' : ''}
        </div>
    `).join('');
}

/**
 * Render scheduled tournament awaiting results
 */
function renderScheduledTournament(tournament, dateState) {
    const icon = dateState.isToday ? '🎾' : dateState.isPast ? '⏳' : '📅';
    const statusClass = dateState.isToday ? 'status-today' 
        : dateState.isPast ? 'status-pending' 
        : 'status-scheduled';
    
    let message, submessage;
    
    if (dateState.isToday) {
        message = 'Tournament in Progress';
        submessage = 'Results will appear once the competition concludes';
    } else if (dateState.isPast) {
        message = 'Awaiting Results';
        submessage = 'Tournament completed, waiting for data update';
    } else {
        message = `Coming in ${dateState.daysUntil} day${dateState.daysUntil === 1 ? '' : 's'}`;
        submessage = 'Get ready for the competition!';
    }
    
    return `
        <div class="scheduled-card ${statusClass}">
            <div class="scheduled-icon">${icon}</div>
            <div class="scheduled-content">
                <h3 class="scheduled-title">${message}</h3>
                <p class="scheduled-subtitle">${submessage}</p>
                ${tournament.tournamentsPlayed > 0 ? `
                    <div class="scheduled-meta">
                        <span class="meta-item">🎯 ${tournament.tournamentsPlayed} tournament${tournament.tournamentsPlayed === 1 ? '' : 's'} planned</span>
                        ${tournament.participants.length > 0 ? `
                            <span class="meta-item">👥 ${tournament.participants.length} players</span>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
            <div class="scheduled-pulse"></div>
        </div>
    `;
}

function renderMotivationMessages() {
    const container = document.getElementById('motivationMessages');
    const messages = generateMotivationMessages();
    
    if (messages.length === 0) {
        container.innerHTML = '<p class="motivation-card">Start winning to see your storylines!</p>';
        return;
    }
    
    container.innerHTML = messages.map(msg => `
        <div class="motivation-card">${msg}</div>
    `).join('');
}

function generateMotivationMessages() {
    const messages = [];
    
    if (tournamentData.length === 0) return messages;
    
    // Check latest tournament date state
    const latestEntry = tournamentData[0];
    const dateState = getTournamentDateState(latestEntry.date);
    
    // TODAY-SPECIFIC MESSAGES (highest priority)
    if (CONFIG.FEATURE_TOGGLES?.DATE_AWARE_MESSAGES !== false && dateState.isToday) {
        if (latestEntry.state === 'scheduled') {
            messages.push('🎾 Tournament day is HERE! Good luck to all players!');
            messages.push('💪 Time to prove your skills on the court!');
        } else {
            messages.push('🎉 Fresh champions crowned TODAY! Congratulations to the winners!');
            messages.push('🔥 The competition was intense today!');
        }
    }
    
    // UPCOMING TOURNAMENT MESSAGES
    if (CONFIG.FEATURE_TOGGLES?.DATE_AWARE_MESSAGES !== false) {
        const upcomingScheduled = tournamentData.filter(t => {
            const ds = getTournamentDateState(t.date);
            return t.state === 'scheduled' && ds.isFuture && ds.daysUntil <= 7;
        });
        
        if (upcomingScheduled.length > 0 && !dateState.isToday) {
            const next = upcomingScheduled[0];
            const nextDateState = getTournamentDateState(next.date);
            messages.push(`📅 Next tournament in ${nextDateState.daysUntil} day${nextDateState.daysUntil === 1 ? '' : 's'}. Are you ready?`);
        }
        
        // AWAITING RESULTS MESSAGE
        const awaitingResults = tournamentData.filter(t => {
            const ds = getTournamentDateState(t.date);
            return t.state === 'scheduled' && ds.isPast;
        });
        
        if (awaitingResults.length > 0 && messages.length < 3) {
            messages.push('⏳ Some tournament results are still pending. Check back soon!');
        }
    }
    
    // STREAK MESSAGES
    if (playerStats.length > 0) {
        const streakPlayers = playerStats.filter(p => p.currentStreak >= 3);
        streakPlayers.forEach(player => {
            if (messages.length < 5) {
                messages.push(`🔥 ${player.name} is on a ${player.currentStreak}-week winning streak!`);
            }
        });
        
        // BEST DUO MESSAGE
        if (pairStats.length > 0 && pairStats[0].wins >= 2 && messages.length < 5) {
            messages.push(`🔗 Can anyone break the ${pairStats[0].pair} combo? They have ${pairStats[0].wins} wins together!`);
        }
        
        // CLOSE COMPETITION
        if (playerStats.length >= 2 && messages.length < 5) {
            const diff = playerStats[0].totalWins - playerStats[1].totalWins;
            if (diff === 1) {
                messages.push(`⚔️ ${playerStats[1].name} is just 1 win away from overtaking ${playerStats[0].name}!`);
            } else if (diff === 0) {
                messages.push(`⚔️ Tied at the top! ${playerStats[0].name} and ${playerStats[1].name} are neck and neck!`);
            }
        }
        
        // HIGH WIN RATE
        const highWinRate = playerStats.filter(p => p.winRate >= 80 && p.sundaysPlayed >= 5);
        highWinRate.forEach(player => {
            if (messages.length < 5) {
                messages.push(`💎 ${player.name} has an impressive ${player.winRate}% win rate!`);
            }
        });
    }
    
    return messages.slice(0, 5); // Show max 5 messages
}

/**
 * Render participants list - ALL unique players with search
 */
function renderParticipants() {
    const section = document.getElementById('participantsSection');
    const titleElement = document.getElementById('participantsTitle');
    const subtitleElement = document.getElementById('participantsSubtitle');
    const container = document.getElementById('participantsList');
    
    if (!section || !container) return;
    
    if (tournamentData.length === 0) {
        section.style.display = 'none';
        return;
    }
    
    // Get ALL unique participants across all tournaments
    const allParticipants = new Set();
    tournamentData.forEach(tournament => {
        if (tournament.participants) {
            tournament.participants.forEach(p => allParticipants.add(p));
        }
    });
    
    if (allParticipants.size === 0) {
        section.style.display = 'none';
        return;
    }
    
    section.style.display = 'block';
    titleElement.textContent = `👥 All Participants (${allParticipants.size})`;
    subtitleElement.textContent = '🔍 Search or scroll through all players';
    
    // Sort alphabetically
    const participantsArray = Array.from(allParticipants).sort();
    
    // Render with search box
    container.innerHTML = `
        <div class="participants-search-box">
            <input type="text" 
                   id="participantsSearch" 
                   placeholder="🔍 Search players..." 
                   class="search-input"
                   onkeyup="filterParticipants(this.value)">
            <span class="search-count" id="participantsCount">${participantsArray.length} players</span>
        </div>
        <div class="participants-chips-scrollable" id="participantsChipsContainer">
            ${participantsArray.map(participant => {
                // Check if has wins
                const hasWins = playerStats.some(p => p.name === participant && p.totalWins > 0);
                return `<span class="participant-chip ${hasWins ? 'has-wins' : ''}" 
                             data-name="${participant.toLowerCase()}" 
                             title="${hasWins ? '🏆 Has wins' : 'Participant'}">
                            <span class="participant-icon">🏸</span>
                            <span>${participant}</span>
                        </span>`;
            }).join('')}
        </div>
    `;
    
    section.style.display = 'block';
}

// Global function for participant filtering
function filterParticipants(searchTerm) {
    const container = document.getElementById('participantsChipsContainer');
    if (!container) return;
    
    const chips = container.querySelectorAll('.participant-chip');
    const searchLower = searchTerm.toLowerCase().trim();
    
    let visibleCount = 0;
    chips.forEach(chip => {
        const name = chip.getAttribute('data-name');
        if (name.includes(searchLower)) {
            chip.style.display = 'inline-flex';
            visibleCount++;
        } else {
            chip.style.display = 'none';
        }
    });
    
    const countElement = document.getElementById('participantsCount');
    if (countElement) {
        countElement.textContent = searchTerm 
            ? `${visibleCount} of ${chips.length} players` 
            : `${chips.length} players`;
    }
}

/**
 * Render tournament timeline view
 */
function renderTimeline() {
    const container = document.getElementById('tournamentTimeline');
    const section = document.getElementById('timelineSection');
    
    if (!container || !section) return;
    
    if (tournamentData.length === 0) {
        section.style.display = 'none';
        return;
    }
    
    // Group tournaments by date
    const tournamentsByDate = {};
    tournamentData.forEach(tournament => {
        if (!tournamentsByDate[tournament.date]) {
            tournamentsByDate[tournament.date] = {
                date: tournament.date,
                state: tournament.state,
                participants: tournament.participants,
                tournamentsPlayed: tournament.tournamentsPlayed,
                tournaments: []
            };
        }
        if (tournament.state === 'completed') {
            tournamentsByDate[tournament.date].tournaments.push(tournament);
        }
    });
    
    // Convert to array and classify by date
    const timelineEntries = Object.values(tournamentsByDate).map(entry => {
        const dateState = getTournamentDateState(entry.date);
        const stateMessage = getTournamentStateMessage({
            ...entry,
            state: entry.tournaments.length > 0 ? 'completed' : 'scheduled'
        });
        
        let timelineClass;
        if (dateState.isToday) {
            timelineClass = 'today';
        } else if (dateState.isFuture) {
            timelineClass = 'future';
        } else if (dateState.daysAgo <= 7) {
            timelineClass = 'recent';
        } else {
            timelineClass = 'past';
        }
        
        return {
            ...entry,
            dateState,
            stateMessage,
            timelineClass
        };
    });
    
    // Sort: today first, then future (ascending), then past (descending)
    timelineEntries.sort((a, b) => {
        if (a.dateState.isToday) return -1;
        if (b.dateState.isToday) return 1;
        
        if (a.dateState.isFuture && b.dateState.isFuture) {
            return a.dateState.daysDiff - b.dateState.daysDiff;
        }
        if (a.dateState.isFuture) return -1;
        if (b.dateState.isFuture) return 1;
        
        return b.dateState.daysDiff - a.dateState.daysDiff;
    });
    
    // Limit timeline cards
    const maxCards = CONFIG.DISPLAY?.MAX_TIMELINE_CARDS || 12;
    const displayEntries = timelineEntries.slice(0, maxCards);
    
    // Render timeline cards
    container.innerHTML = displayEntries.map(entry => `
        <div class="timeline-card ${entry.timelineClass}">
            <div class="timeline-header">
                <span class="timeline-date">${formatDate(entry.date)}</span>
                <span class="timeline-badge ${entry.timelineClass}">
                    ${entry.stateMessage.status}
                </span>
            </div>
            <div class="timeline-content">
                <p class="timeline-status">${entry.stateMessage.subtitle}</p>
                
                ${entry.tournaments.length > 0 ? `
                    <div class="timeline-winners">
                        ${entry.tournaments.map(t => `
                            <div class="timeline-winner-item">
                                <span>🏆 T${t.tournamentNo}:</span>
                                <strong>${t.winner1} & ${t.winner2}</strong>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <p class="timeline-status">
                        ${entry.state === 'scheduled' 
                            ? '⏳ Looking for next winners' 
                            : ''}
                    </p>
                `}
                
                ${entry.participants && entry.participants.length > 0 ? `
                    <div class="timeline-participants">
                        ${entry.participants.slice(0, 5).map(p => `
                            <span class="timeline-participant-tag">${p}</span>
                        `).join('')}
                        ${entry.participants.length > 5 ? `
                            <span class="timeline-participant-tag">+${entry.participants.length - 5} more</span>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
    
    section.style.display = 'block';
}

function renderLeaderboard() {
    const container = document.getElementById('leaderboard');
    
    if (playerStats.length === 0) {
        container.innerHTML = '<p class="section-subtitle">No player data available yet.</p>';
        return;
    }
    
    container.innerHTML = `
        <div class="leaderboard-controls">
            <div class="controls-row">
                <input type="text" 
                       id="leaderboardSearch" 
                       placeholder="🔍 Search players..." 
                       class="search-input"
                       onkeyup="filterLeaderboard(this.value)">
                <div class="sort-buttons">
                    <button class="sort-btn active" data-sort="wins" onclick="sortLeaderboard('wins')">🏆 Wins</button>
                    <button class="sort-btn" data-sort="winrate" onclick="sortLeaderboard('winrate')">📊 Win%</button>
                    <button class="sort-btn" data-sort="form" onclick="sortLeaderboard('form')">📈 Form</button>
                    <button class="sort-btn" data-sort="streak" onclick="sortLeaderboard('streak')">🔥 Streak</button>
                </div>
            </div>
        </div>
        <div class="leaderboard-scrollable" id="leaderboardCards">
            ${playerStats.map(player => renderEnhancedPlayerCard(player)).join('')}
        </div>
    `;
}

// Global function for leaderboard search
function filterLeaderboard(searchTerm) {
    const container = document.getElementById('leaderboardCards');
    if (!container) return;
    
    const cards = container.querySelectorAll('.player-card-enhanced');
    const searchLower = searchTerm.toLowerCase().trim();
    
    cards.forEach(card => {
        const playerName = card.getAttribute('data-player');
        if (playerName && playerName.toLowerCase().includes(searchLower)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Attach to window
window.filterLeaderboard = filterLeaderboard;

// Enhanced player card renderer
function renderEnhancedPlayerCard(player) {
    const rankEmoji = getRankEmoji(player.rank);
    const rankChangeIcon = getRankChangeIcon(player.rankChange);
    const formIndicator = getFormIndicator(player.last5WinRate);
    const streakBadge = player.currentStreak >= 3 ? '🔥' : player.currentStreak === 0 ? '❄️' : '➖';
    
    return `
        <div class="player-card-enhanced" data-player="${player.name}">
            <div class="player-header">
                <div class="player-rank-section">
                    <span class="rank-emoji">${rankEmoji}</span>
                    <span class="rank-number">#${player.rank}</span>
                    ${rankChangeIcon ? `<span class="rank-change ${player.rankChange > 0 ? 'up' : player.rankChange < 0 ? 'down' : 'neutral'}">${rankChangeIcon}</span>` : ''}
                </div>
                <div class="player-name-section">
                    <h3 class="player-name">${player.name}</h3>
                    ${player.previousRank ? `<span class="previous-rank">was #${player.previousRank}</span>` : ''}
                </div>
                <div class="player-form-indicator">
                    ${formIndicator}
                </div>
            </div>
            
            <div class="player-stats-grid">
                <!-- Win/Loss Record -->
                <div class="stat-card primary">
                    <div class="stat-icon">🏆</div>
                    <div class="stat-content">
                        <div class="stat-value">${player.totalWins}W-${player.totalLosses}L</div>
                        <div class="stat-label">${player.totalMatches} matches</div>
                    </div>
                </div>
                
                <!-- Win Rate -->
                <div class="stat-card">
                    <div class="stat-icon">📊</div>
                    <div class="stat-content">
                        <div class="stat-value">${player.winRate}%</div>
                        <div class="stat-label">win rate</div>
                        <div class="stat-progress">
                            <div class="progress-bar" style="width: ${Math.min(player.winRate, 100)}%"></div>
                        </div>
                    </div>
                </div>
                
                <!-- Streak -->
                <div class="stat-card">
                    <div class="stat-icon">${streakBadge}</div>
                    <div class="stat-content">
                        <div class="stat-value">${player.currentStreak}-streak</div>
                        <div class="stat-label">Best: ${player.bestStreak}</div>
                    </div>
                </div>
                
                <!-- Participation -->
                <div class="stat-card">
                    <div class="stat-icon">📅</div>
                    <div class="stat-content">
                        <div class="stat-value">${player.sundaysPlayed} Sundays</div>
                        <div class="stat-label">${player.participationRate}% attendance</div>
                    </div>
                </div>
            </div>
            
            <!-- Recent Form -->
            ${player.last5Form ? `
                <div class="player-form-section">
                    <span class="form-label">📈 Recent Form:</span>
                    <span class="form-display">${renderFormChips(player.last5Form, player.last5Tournaments)}</span>
                    <span class="form-rate">(${player.last5WinRate}%)</span>
                </div>
            ` : ''}
            
            <!-- Last Win -->
            ${player.lastWinDate ? `
                <div class="player-last-win">
                    ⏱️ Last win: ${formatDateRelative(player.lastWinDate)} ${player.daysSinceLastWin > 0 ? `(${player.daysSinceLastWin} days ago)` : ''}
                </div>
            ` : ''}
            
            <!-- Next Milestone -->
            ${player.nextMilestone ? `
                <div class="player-milestone">
                    🎯 ${player.nextMilestone.message}
                </div>
            ` : `
                <div class="player-milestone champion">
                    👑 Leading the Pack!
                </div>
            `}
            
            <!-- Badges -->
            ${player.badges.length > 0 ? `
                <div class="player-badges-compact">
                    ${player.badges.slice(0, 6).map(badge => `
                        <span class="badge-mini" data-tier="${badge.tier}" title="${badge.name}">${badge.icon}</span>
                    `).join('')}
                    ${player.badges.length > 6 ? `<span class="badge-mini">+${player.badges.length - 6}</span>` : ''}
                </div>
            ` : ''}
        </div>
    `;
}

// Sort leaderboard by different criteria
function sortLeaderboard(sortBy) {
    // Update button states
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.sort === sortBy);
    });
    
    // Sort playerStats
    const sorted = [...playerStats];
    
    switch(sortBy) {
        case 'wins':
            sorted.sort((a, b) => {
                if (b.totalWins !== a.totalWins) return b.totalWins - a.totalWins;
                return a.totalMatches - b.totalMatches;
            });
            break;
        case 'winrate':
            sorted.sort((a, b) => {
                if (b.winRate !== a.winRate) return b.winRate - a.winRate;
                return b.totalWins - a.totalWins;
            });
            break;
        case 'form':
            sorted.sort((a, b) => {
                if (b.last5WinRate !== a.last5WinRate) return b.last5WinRate - a.last5WinRate;
                return b.totalWins - a.totalWins;
            });
            break;
        case 'streak':
            sorted.sort((a, b) => {
                if (b.currentStreak !== a.currentStreak) return b.currentStreak - a.currentStreak;
                if (b.bestStreak !== a.bestStreak) return b.bestStreak - a.bestStreak;
                return b.totalWins - a.totalWins;
            });
            break;
    }
    
    // FIX BUG #6: Safer re-render with leaderboardCards container
    const container = document.getElementById('leaderboardCards');
    if (container) {
        container.innerHTML = sorted.map(player => renderEnhancedPlayerCard(player)).join('');
    }
}

// Attach to window for HTML onclick
window.sortLeaderboard = sortLeaderboard;

// Helper: Get rank change icon
function getRankChangeIcon(change) {
    if (change > 0) return `↑${change}`;
    if (change < 0) return `↓${Math.abs(change)}`;
    return '-';
}

// Helper: Get form indicator
function getFormIndicator(winRate) {
    if (winRate >= 80) return '<span class="form-hot">🔥 Hot</span>';
    if (winRate >= 60) return '<span class="form-rising">📈 Rising</span>';
    if (winRate >= 40) return '<span class="form-neutral">➖ Steady</span>';
    if (winRate >= 20) return '<span class="form-falling">📉 Falling</span>';
    return '<span class="form-cold">❄️ Cold</span>';
}

// Helper: Render form chips
function renderFormChips(formString, tournaments) {
    // FIX BUG #21 & #5: Add null safety for tournaments array and data
    if (!formString) return '<span class="no-form">No recent data</span>';
    
    const results = formString.split('-');
    return results.map((result, index) => {
        const tournament = (tournaments && Array.isArray(tournaments) && tournaments[index]) ? tournaments[index] : null;
        const tooltip = (tournament && tournament.tournamentNo && tournament.date)
            ? `T${tournament.tournamentNo} on ${formatDate(tournament.date)}`
            : 'Recent tournament';
        return `<span class="form-chip ${result === 'W' ? 'win' : 'loss'}" title="${tooltip}">${result}</span>`;
    }).join('');
}

// Helper: Format date relative to today
function formatDateRelative(dateStr) {
    const date = parseDate(dateStr);
    const today = new Date();
    const diffDays = Math.floor((today - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    return formatDate(dateStr);
}

function renderPairPerformance() {
    const container = document.getElementById('pairPerformance');
    
    if (pairStats.length === 0) {
        container.innerHTML = '<p class="section-subtitle">No pair data available yet.</p>';
        return;
    }
    
    const topPairs = pairStats.slice(0, 5);
    
    container.innerHTML = topPairs.map((pair, index) => `
        <div class="pair-card">
            <div>
                <span style="font-size: 1.25rem; margin-right: 0.5rem;">${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🔹'}</span>
                <span class="pair-names">${pair.pair}</span>
            </div>
            <div class="pair-wins">${pair.wins} wins</div>
        </div>
    `).join('');
}

function renderTournamentHistory() {
    const container = document.getElementById('tournamentHistory');
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    
    if (tournamentData.length === 0) {
        container.innerHTML = '<p class="section-subtitle">No tournament history available yet.</p>';
        loadMoreBtn.style.display = 'none';
        return;
    }
    
    // FIX BUG #24: Filter out tournaments without results
    const completedTournaments = tournamentData.filter(t => t.state === 'completed' && t.winner1 && t.winner2);
    const visibleData = completedTournaments.slice(0, historyVisible);
    
    container.innerHTML = visibleData.map(tournament => `
        <div class="history-item">
            <div class="history-date">${formatDate(tournament.date)}</div>
            <div class="history-winners">
                <strong>T${tournament.tournamentNo}</strong> 🏆 ${tournament.winner1} & ${tournament.winner2}
            </div>
        </div>
    `).join('');
    
    // Show/hide load more button
    loadMoreBtn.style.display = historyVisible < completedTournaments.length ? 'block' : 'none';
}

function loadMoreHistory() {
    historyVisible += CONFIG.HISTORY_LOAD_MORE;
    renderTournamentHistory();
}

// ===== Helper Functions =====
function checkFeatureUnlock(featureName) {
    const gate = FEATURE_GATES[featureName];
    if (!gate) return { unlocked: true };
    
    const uniquePlayers = new Set();
    tournamentData.forEach(t => {
        if (t.winner1) uniquePlayers.add(t.winner1);
        if (t.winner2) uniquePlayers.add(t.winner2);
    });
    
    const tournamentCount = tournamentData.length;
    const playerCount = uniquePlayers.size;
    
    const unlocked = (
        tournamentCount >= gate.minTournaments &&
        playerCount >= gate.minPlayers
    );
    
    return {
        unlocked,
        progress: tournamentCount / gate.minTournaments,
        remaining: Math.max(0, gate.minTournaments - tournamentCount)
    };
}

function getRankEmoji(rank) {
    switch(rank) {
        case 1: return '1️⃣';
        case 2: return '2️⃣';
        case 3: return '3️⃣';
        case 4: return '4️⃣';
        case 5: return '5️⃣';
        case 6: return '6️⃣';
        case 7: return '7️⃣';
        case 8: return '8️⃣';
        case 9: return '9️⃣';
        case 10: return '🔟';
        default: return `#${rank}`;
    }
}

function formatDate(dateString) {
    // Use parseDate to handle DD-MM-YYYY format
    const date = parseDate(dateString);
    if (isNaN(date.getTime())) {
        return dateString; // Return original if invalid
    }
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function updateLastUpdatedTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit'
    });
    const dateString = now.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric'
    });
    
    document.getElementById('updateTime').textContent = `${dateString} at ${timeString}`;
}

function showLoading() {
    document.getElementById('loadingState').style.display = 'flex';
    document.getElementById('errorState').style.display = 'none';
    document.getElementById('mainContent').style.display = 'none';
}

function showError(message) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('errorState').style.display = 'flex';
    document.getElementById('mainContent').style.display = 'none';
    
    const errorMsg = document.querySelector('.error-message');
    if (message) {
        // Support multiline error messages
        errorMsg.innerHTML = `⚠️ ${message.replace(/\n/g, '<br>')}`;
    }
}

function showContent() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('errorState').style.display = 'none';
    document.getElementById('welcomeState').style.display = 'none';
    document.getElementById('firstWinModal').style.display = 'none';
    document.getElementById('mainContent').style.display = 'block';
}

function showWelcome() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('errorState').style.display = 'none';
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('welcomeState').style.display = 'block';
}

function showFirstWinModal() {
    document.getElementById('firstWinModal').style.display = 'flex';
}

function closeFirstWinModal() {
    document.getElementById('firstWinModal').style.display = 'none';
}

window.closeFirstWinModal = closeFirstWinModal;

function hideSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section && section.parentElement) {
        section.parentElement.style.display = 'none';
    }
}

function renderFirstWinExperience() {
    renderLatestWinners();
    
    // Show special first-win message with motivation
    const container = document.getElementById('motivationMessages');
    const winners = [];
    if (tournamentData.length > 0) {
        const firstTournament = tournamentData[0];
        winners.push(firstTournament.winner1, firstTournament.winner2);
    }
    
    container.innerHTML = `
        <div class="motivation-card first-win-message">
            🎉 <strong>Congratulations ${winners.join(' & ')}!</strong><br>
            Your badminton journey has officially begun!<br><br>
            🔥 <strong>What's Next:</strong><br>
            • Win next Sunday to start your winning streak<br>
            • Play 2 more times to unlock full rankings<br>
            • Build your legacy and earn legendary badges!<br><br>
            💪 The competition starts now!
        </div>
    `;
    
    // Hide leaderboard and other advanced sections
    hideSection('leaderboard');
    hideSection('pairPerformance');
}

function renderUnlockProgress() {
    const section = document.getElementById('unlockProgress');
    const container = document.getElementById('unlockCards');
    
    if (!section || !container) return;
    
    const features = [
        {
            name: 'BASIC_RANKINGS',
            title: 'Player Rankings',
            icon: '📈',
            description: 'See who\'s dominating the league'
        },
        {
            name: 'STREAK_TRACKING',
            title: 'Win Streaks',
            icon: '🔥',
            description: 'Track consecutive Sunday victories'
        },
        {
            name: 'DUO_TRACKING',
            title: 'Best Duos',
            icon: '🔗',
            description: 'Discover strongest partnerships'
        },
        {
            name: 'FULL_BADGES',
            title: 'All Badge Types',
            icon: '🎯',
            description: 'Unlock achievement badges'
        }
    ];
    
    let hasLockedFeatures = false;
    let html = '';
    
    features.forEach(feature => {
        const unlock = checkFeatureUnlock(feature.name);
        
        if (!unlock.unlocked) {
            hasLockedFeatures = true;
            const progress = Math.min(100, unlock.progress * 100);
            
            html += `
                <div class="unlock-card locked">
                    <div class="unlock-icon">🔒</div>
                    <div class="unlock-info">
                        <h4>${feature.icon} ${feature.title}</h4>
                        <p>${feature.description}</p>
                        <div class="unlock-progress-bar">
                            <div class="unlock-progress-fill" style="width: ${progress}%"></div>
                        </div>
                        <p class="unlock-text">${unlock.remaining} more tournament${unlock.remaining === 1 ? '' : 's'} to unlock</p>
                    </div>
                </div>
            `;
        }
    });
    
    if (hasLockedFeatures) {
        container.innerHTML = html;
        section.style.display = 'block';
    } else {
        section.style.display = 'none';
    }
}

// Attach global functions to window for HTML event handlers
window.loadMoreHistory = loadMoreHistory;