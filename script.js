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
const SAMPLE_DATA = `Date,Participants,TournamentsPlayed,Teams,Winners
08-02-2026,"Naveen,Vardhan,Kishore,Vivek,Ravi,Kumar,Sanjay,Prasad",2,"Team C, Team D","1-Naveen and Vardhan, 2-Kishore and Vivek"
15-02-2026,"Naveen,Vardhan,Kishore,Vivek,Ravi,Kumar",2,"Team A, Team B","1-Vardhan and Kishore, 2-Naveen and Vivek"
22-02-2026,"Naveen,Vardhan,Kishore,Vivek,Ravi,Kumar,Sanjay,Prasad",3,"Team A, Team B, Team C","1-Vardhan and Naveen, 2-Kishore and Vivek, 3-Naveen and Kishore"
01-03-2026,"Naveen,Vardhan,Kishore,Vivek",1,"Team A","1-Vardhan and Vivek"
08-03-2026,"Naveen,Vardhan,Kishore,Vivek,Ravi,Kumar",2,"Team B, Team C","1-Naveen and Kishore, 2-Vardhan and Vivek"`;

// ===== Data Loading =====
async function loadData() {
    try {
        showLoading();
        
        let csvText;
        
        // Check if in test mode
        if (CONFIG.TEST_MODE) {
            // Use sample data for testing
            csvText = SAMPLE_DATA;
            console.log('🧪 Loading sample test data...');
        } else {
            // Validate CSV URL
            if (CONFIG.CSV_URL === 'YOUR_GOOGLE_SHEETS_CSV_URL_HERE') {
                throw new Error('Please configure your Google Sheets CSV URL in config.js');
            }
            
            // Fetch CSV data from Google Sheets
            const response = await fetch(CONFIG.CSV_URL + '&cachebust=' + Date.now());
            if (!response.ok) throw new Error('Failed to fetch data');
            
            csvText = await response.text();
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
        const participants = values[1].split(',').map(p => p.trim()).filter(p => p);
        const tournamentsPlayed = parseInt(values[2]) || 1;
        const teams = values[3].split(',').map(t => t.trim()).filter(t => t);
        const winnersStr = values[4];
        
        console.log('Parsing row:', { dateStr, participants, tournamentsPlayed, winnersStr });
        
        // Parse winners string: "1-Naveen and Vardhan, 2-Kishore and Vivek"
        const tournaments = parseWinners(winnersStr, dateStr);
        
        console.log('Parsed tournaments:', tournaments);
        
        // Add all parsed tournaments to data
        tournaments.forEach(tournament => {
            data.push(tournament);
        });
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

function parseWinners(winnersStr, date) {
    const tournaments = [];
    
    // Split by tournament number patterns: "1-..., 2-..., 3-..."
    // Handle spaces around dash: "1-", "1 -", "1- ", "1 - "
    const parts = winnersStr.split(/,\s*(?=\d+\s*-)/); 
    
    console.log('Split winners into parts:', parts);
    
    parts.forEach(part => {
        // Match tournament number with flexible spacing: "1-name" or "1 - name" or "1- name"
        const match = part.match(/(\d+)\s*-\s*(.+)/);
        if (match) {
            const tournamentNo = match[1];
            const winnersText = match[2].trim();
            
            console.log(`Tournament ${tournamentNo}: "${winnersText}"`);
            
            // Parse winner names: "Naveen and Vardhan" or "Naveen & Vardhan"
            const winners = parseWinnerPair(winnersText);
            
            console.log(`Winners parsed:`, winners);
            
            if (winners.length === 2) {
                tournaments.push({
                    date: normalizeDate(date),
                    tournamentNo: tournamentNo,
                    winner1: winners[0],
                    winner2: winners[1]
                });
            } else {
                console.warn(`Could not parse 2 winners from: "${winnersText}"`);
            }
        } else {
            console.warn(`Could not match tournament pattern in: "${part}"`);
        }
    });
    
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

function normalizeDate(dateStr) {
    // Handle formats: DD-MM-YYYY, MM-DD-YYYY, YYYY-MM-DD
    const parts = dateStr.split(/[-\/]/);
    
    if (parts.length === 3) {
        // If first part is 4 digits, it's YYYY-MM-DD
        if (parts[0].length === 4) {
            return dateStr; // Already in correct format
        }
        // If third part is 4 digits, it's DD-MM-YYYY or MM-DD-YYYY
        if (parts[2].length === 4) {
            // Assume DD-MM-YYYY (European format)
            return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
    }
    
    return dateStr;
}

function parseDate(dateStr) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
    }
    return new Date(dateStr);
}

// ===== Stats Calculation =====
function calculateAllStats() {
    if (tournamentData.length === 0) {
        playerStats = [];
        pairStats = [];
        appState = 'empty';
        return;
    }
    
    // Determine app state based on data volume
    const uniquePlayers = new Set();
    tournamentData.forEach(t => {
        if (t.winner1) uniquePlayers.add(t.winner1);
        if (t.winner2) uniquePlayers.add(t.winner2);
    });
    
    const tournamentCount = tournamentData.length;
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
    
    // Calculate individual player stats
    playerStats = calculatePlayerStats();
    
    // Calculate pair stats
    pairStats = calculatePairStats();
}

function calculatePlayerStats() {
    const playersMap = new Map();
    
    // Process each tournament
    tournamentData.forEach(tournament => {
        const players = [tournament.winner1, tournament.winner2];
        const date = tournament.date;
        
        players.forEach(player => {
            if (!player) return;
            
            if (!playersMap.has(player)) {
                playersMap.set(player, {
                    name: player,
                    totalWins: 0,
                    sundays: new Set(),
                    tournaments: [],
                    partners: new Map()
                });
            }
            
            const stats = playersMap.get(player);
            stats.totalWins++;
            stats.sundays.add(date);
            stats.tournaments.push({
                date,
                tournamentNo: tournament.tournamentNo,
                partner: players.find(p => p !== player)
            });
            
            // Track partners
            const partner = players.find(p => p !== player);
            if (partner) {
                stats.partners.set(partner, (stats.partners.get(partner) || 0) + 1);
            }
        });
    });
    
    // Convert to array and calculate additional stats
    const statsArray = Array.from(playersMap.values()).map(player => {
        const sundaysPlayed = player.sundays.size;
        const winRate = sundaysPlayed > 0 ? (player.totalWins / sundaysPlayed * 100) : 0;
        
        return {
            ...player,
            sundaysPlayed,
            winRate: Math.round(winRate * 10) / 10, // Round to 1 decimal
            currentStreak: calculateStreak(player.tournaments),
            badges: []
        };
    });
    
    // Sort by total wins (descending), then by win rate
    statsArray.sort((a, b) => {
        if (b.totalWins !== a.totalWins) {
            return b.totalWins - a.totalWins;
        }
        return b.winRate - a.winRate;
    });
    
    // Assign ranks
    statsArray.forEach((player, index) => {
        player.rank = index + 1;
    });
    
    // Assign badges
    assignBadges(statsArray);
    
    return statsArray;
}

function calculatePairStats() {
    const pairsMap = new Map();
    
    tournamentData.forEach(tournament => {
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
        if (tournamentData.length > 0) {
            const firstTournament = tournamentData[tournamentData.length - 1];
            if (firstTournament.winner1 === player.name || firstTournament.winner2 === player.name) {
                badges.push({ icon: '🌟', name: 'First Blood', tier: 'rare' });
            }
        }
        
        // 24. Legend - 50+ wins
        if (player.totalWins >= CONFIG.BADGES.LEGEND_WINS) {
            badges.push({ icon: '🐉', name: 'Legend', tier: 'legendary' });
        }
        
        // 25. Free Agent - Never won with same partner twice (5+ wins)
        if (player.partners && player.partners.size > 0 && player.totalWins >= CONFIG.BADGES.FREE_AGENT_MIN_WINS) {
            const maxPartnerWins = Math.max(...player.partners.values());
            if (maxPartnerWins === 1) {
                badges.push({ icon: '🦅', name: 'Free Agent', tier: 'epic' });
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
    
    renderTournamentHistory();
}

function renderLatestWinners() {
    const container = document.getElementById('latestWinnersGrid');
    const dateElement = document.getElementById('latestDate');
    
    if (tournamentData.length === 0) {
        container.innerHTML = '<p class="section-subtitle">No tournament data available yet.</p>';
        dateElement.textContent = '--';
        return;
    }
    
    // Get latest Sunday's tournaments
    const latestDate = tournamentData[0].date;
    const latestTournaments = tournamentData.filter(t => t.date === latestDate);
    
    dateElement.textContent = formatDate(latestDate);
    
    container.innerHTML = latestTournaments.map(tournament => `
        <div class="winner-card">
            <div class="trophy">🏆</div>
            <div class="tournament-label">Tournament ${tournament.tournamentNo} Winners</div>
            <div class="winner-names">✨ ${tournament.winner1} & ${tournament.winner2} ✨</div>
            <div class="celebration-text">🎊 Champions! 🎊</div>
        </div>
    `).join('');
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
    
    if (playerStats.length === 0) return messages;
    
    // Streak messages
    const streakPlayers = playerStats.filter(p => p.currentStreak >= 3);
    streakPlayers.forEach(player => {
        messages.push(`🔥 ${player.name} is on a ${player.currentStreak}-week winning streak!`);
    });
    
    // Best duo message
    if (pairStats.length > 0 && pairStats[0].wins >= 2) {
        messages.push(`🔗 Can anyone break the ${pairStats[0].pair} combo? They have ${pairStats[0].wins} wins together!`);
    }
    
    // Close competition
    if (playerStats.length >= 2) {
        const diff = playerStats[0].totalWins - playerStats[1].totalWins;
        if (diff === 1) {
            messages.push(`⚔️ ${playerStats[1].name} is just 1 win away from overtaking ${playerStats[0].name}!`);
        }
    }
    
    // High win rate
    const highWinRate = playerStats.filter(p => p.winRate >= 80 && p.sundaysPlayed >= 5);
    highWinRate.forEach(player => {
        messages.push(`💎 ${player.name} has an impressive ${player.winRate}% win rate!`);
    });
    
    return messages.slice(0, 3); // Show max 3 messages
}

function renderLeaderboard() {
    const container = document.getElementById('leaderboard');
    
    if (playerStats.length === 0) {
        container.innerHTML = '<p class="section-subtitle">No player data available yet.</p>';
        return;
    }
    
    container.innerHTML = playerStats.map(player => `
        <div class="player-card">
            <div class="player-rank rank-${player.rank}">${getRankEmoji(player.rank)}</div>
            <div class="player-info">
                <div class="player-name">${player.name}</div>
                <div class="player-stats">
                    <span class="stat-item">🏆 ${player.totalWins} wins</span>
                    <span class="stat-item">📅 ${player.sundaysPlayed} Sundays</span>
                    <span class="stat-item">📊 ${player.winRate}% win rate</span>
                </div>
                ${player.badges.length > 0 ? `
                    <div class="player-badges">
                        ${player.badges.map(badge => `
                            <span class="badge" data-tier="${badge.tier || 'common'}">${badge.icon} ${badge.name}</span>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
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
    
    const visibleData = tournamentData.slice(0, historyVisible);
    
    container.innerHTML = visibleData.map(tournament => `
        <div class="history-item">
            <div class="history-date">${formatDate(tournament.date)}</div>
            <div class="history-winners">
                <strong>T${tournament.tournamentNo}</strong> 🏆 ${tournament.winner1} & ${tournament.winner2}
            </div>
        </div>
    `).join('');
    
    // Show/hide load more button
    loadMoreBtn.style.display = historyVisible < tournamentData.length ? 'block' : 'none';
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
    const date = new Date(dateString);
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
        errorMsg.textContent = `⚠️ ${message}`;
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

function showContent() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('errorState').style.display = 'none';
    document.getElementById('mainContent').style.display = 'block';
}
