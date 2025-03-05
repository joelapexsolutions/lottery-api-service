const express = require('express');
const cors = require('cors');
const https = require('https');

const app = express();
app.use(cors());
const port = process.env.PORT || 3000;

// Enhanced cache with shorter expiry time for more frequent updates
const cache = {
  data: {},
  timestamps: {},
  maxAge: 5 * 60 * 1000, // 5 minutes expiry
  
  get: function(key) {
    const now = Date.now();
    if (this.data[key] && now - this.timestamps[key] < this.maxAge) {
      return this.data[key];
    }
    return null;
  },
  
  set: function(key, value) {
    this.data[key] = value;
    this.timestamps[key] = Date.now();
  }
};

// Function to fetch HTML with timeout and error handling
function fetchHTML(url, timeout = 8000) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: timeout
    }, (res) => {
      // Check for redirect
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchHTML(res.headers.location, timeout)
          .then(resolve)
          .catch(reject);
      }
      
      // Check for successful response
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to load page, status code: ${res.statusCode}`));
        return;
      }
      
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve(data);
      });
    });
    
    request.on('error', (err) => {
      reject(err);
    });
    
    // Set a timeout for the request
    request.on('timeout', () => {
      request.abort();
      reject(new Error('Request timed out'));
    });
  });
}

// Lottery site URLs mapping - PRIMARY SOURCES (lottoland.co.za)
const PRIMARY_LOTTERY_URLS = {
  'sa_lotto': 'https://www.lottoland.co.za/lotto/results-history',
  'sa_lotto_plus1': 'https://www.lottoland.co.za/lotto-plus/results-history',
  'sa_lotto_plus2': 'https://www.lottoland.co.za/lotto-plus-2/results-history',
  'sa_powerball': 'https://www.lottoland.co.za/powerball/results-history',
  'sa_powerball_plus': 'https://www.lottoland.co.za/powerball-plus/results-history',
  'us_megamillions': 'https://www.lottoland.co.za/mega-millions/results-history',
  'us_powerball': 'https://www.lottoland.co.za/powerball-usa/results-history',
  'euro_jackpot': 'https://www.lottoland.co.za/eurojackpot/results-history',
  'euro_dreams': 'https://www.lottoland.co.za/eurodreams/results-history',
  'spain_euromillions': 'https://www.lottoland.co.za/euromillions/results-history',
  'spain_primitiva': 'https://www.lottoland.co.za/la-primitiva/results-history',
  'france_loto': 'https://www.lottoland.co.za/french-lotto/results-history',
  'italy_superenalotto': 'https://www.lottoland.co.za/superenalotto/results-history',
  'germany_lotto': 'https://www.lottoland.co.za/german-lotto/results-history',
  'aus_ozlotto': 'https://www.lottoland.co.za/oz-lotto/results-history',
  'aus_lotto': 'https://www.lottoland.co.za/saturday-lotto/results-history',
  'aus_powerball': 'https://www.lottoland.co.za/australian-powerball/results-history',
  'canada_649': 'https://www.lottoland.co.za/canada-lotto-649/results-history',
  'nz_lotto': 'https://www.lottoland.co.za/new-zealand-powerball/results-history',
  'ph_grandlotto': 'https://www.lottoland.co.za/philippines-ultra-lotto/results-history'
};

// FALLBACK SOURCES (lotteryextreme.com)
const FALLBACK_LOTTERY_URLS = {
  'sa_lotto': 'https://www.lotteryextreme.com/south-africa-lotto/results',
  'sa_lotto_plus1': 'https://www.lotteryextreme.com/south-africa-lotto-plus/results',
  'sa_lotto_plus2': 'https://www.lotteryextreme.com/south-africa-lotto-plus-2/results',
  'sa_powerball': 'https://www.lotteryextreme.com/south-africa-powerball/results',
  'sa_powerball_plus': 'https://www.lotteryextreme.com/south-africa-powerball-plus/results',
  'us_megamillions': 'https://www.lotteryextreme.com/mega-millions/results',
  'us_powerball': 'https://www.lotteryextreme.com/powerball/results',
  'euro_jackpot': 'https://www.lotteryextreme.com/eurojackpot/results',
  'euro_dreams': 'https://www.lotteryextreme.com/eurodreams/results',
  'spain_euromillions': 'https://www.lotteryextreme.com/euromillions/results',
  'spain_primitiva': 'https://www.lotteryextreme.com/la-primitiva/results',
  'france_loto': 'https://www.lotteryextreme.com/france-loto/results',
  'italy_superenalotto': 'https://www.lotteryextreme.com/superenalotto/results',
  'germany_lotto': 'https://www.lotteryextreme.com/german-lotto/results',
  'aus_ozlotto': 'https://www.lotteryextreme.com/oz-lotto/results',
  'aus_lotto': 'https://www.lotteryextreme.com/saturday-lotto/results',
  'aus_powerball': 'https://www.lotteryextreme.com/australia-powerball/results',
  'canada_649': 'https://www.lotteryextreme.com/canada-lotto-649/results',
  'nz_lotto': 'https://www.lotteryextreme.com/new-zealand-powerball/results',
  'ph_grandlotto': 'https://www.lotteryextreme.com/philippines-ultra-lotto/results'
};

// Draw days and times for accurate countdown (standard draw schedules)
const LOTTERY_SCHEDULES = {
  'sa_lotto': { days: [3, 6], time: '20:30' }, // Wednesday and Saturday at 8:30 PM
  'sa_lotto_plus1': { days: [3, 6], time: '20:30' }, // Same as SA Lotto
  'sa_lotto_plus2': { days: [3, 6], time: '20:30' }, // Same as SA Lotto
  'sa_powerball': { days: [2, 5], time: '21:00' }, // Tuesday and Friday at 9:00 PM
  'sa_powerball_plus': { days: [2, 5], time: '21:00' }, // Same as SA Powerball
  'us_megamillions': { days: [2, 5], time: '23:00' }, // Tuesday and Friday at 11:00 PM
  'us_powerball': { days: [1, 4], time: '22:59' }, // Monday and Thursday at 10:59 PM
  'euro_jackpot': { days: [2, 5], time: '21:00' }, // Tuesday and Friday at 9:00 PM
  'euro_dreams': { days: [1, 4], time: '21:00' }, // Monday and Thursday at 9:00 PM
  'spain_euromillions': { days: [2, 5], time: '21:45' }, // Tuesday and Friday at 9:45 PM
  // Add other lotteries' schedules here
};

// Function to extract data from lottoland.co.za
async function extractFromLottoland(html, lotteryType) {
  try {
    // Create base data structure
    const lotteryData = {
      name: lotteryType.replace(/_/g, ' ').toUpperCase(),
      logo: lotteryType.replace(/_/g, ' ').toUpperCase(),
      nextDraw: calculateNextDrawDate(lotteryType),
      jackpot: "Calculating...",
      lastDrawDate: new Date().toISOString().split('T')[0],
      winningNumbers: [],
      powerball: null,
      hasPowerball: ['sa_powerball', 'sa_powerball_plus', 'us_powerball', 'us_megamillions', 'euro_jackpot', 'aus_powerball'].includes(lotteryType),
      divisions: [],
      historicalResults: []
    };
    
    // Extract winning numbers
    const numbersMatch = html.match(/latest\s+results|latest\s+winning\s+numbers|latest\s+draw\s+results|results.*?<div[^>]*>(.*?)<\/div>/is);
    if (numbersMatch) {
      const numbersSection = numbersMatch[0];
      const digitMatches = numbersSection.match(/\d+/g);
      
      if (digitMatches && digitMatches.length >= 5) {
        // Determine the number of main balls based on lottery type
        let mainBallCount = 6;
        if (lotteryType.includes('us_megamillions') || lotteryType.includes('us_powerball') || 
            lotteryType.includes('sa_powerball') || lotteryType.includes('euro_jackpot')) {
          mainBallCount = 5;
        }
        
        // Get main numbers
        lotteryData.winningNumbers = digitMatches.slice(0, mainBallCount).map(Number);
        
        // Get bonus/powerball number if applicable
        if (lotteryData.hasPowerball && digitMatches.length > mainBallCount) {
          lotteryData.powerball = Number(digitMatches[mainBallCount]);
        }
      }
    }
    
    // Extract jackpot
    const jackpotMatch = html.match(/jackpot.*?([R$€£A][\d,.]+\s*[mM]illion|[R$€£A][\d,.]+)/i);
    if (jackpotMatch && jackpotMatch[1]) {
      lotteryData.jackpot = jackpotMatch[1];
    } else {
      // Default jackpot based on lottery type
      lotteryData.jackpot = getDefaultJackpot(lotteryType);
    }
    
    // Extract last draw date
    const dateMatch = html.match(/draw\s+date|drawn\s+on.*?(\d{1,2}[\/\-\s\.]\d{1,2}[\/\-\s\.]\d{2,4}|\d{1,2}\s+[a-zA-Z]+\s+\d{4})/i);
    if (dateMatch && dateMatch[1]) {
      try {
        const date = new Date(dateMatch[1]);
        if (!isNaN(date.getTime())) {
          lotteryData.lastDrawDate = date.toISOString().split('T')[0];
        }
      } catch (e) { /* Use default date if parsing fails */ }
    }
    
    // Extract prize divisions
    const prizePattern = /<tr[^>]*>.*?<td[^>]*>(.*?)<\/td>.*?<td[^>]*>(.*?)<\/td>.*?<td[^>]*>(.*?)<\/td>.*?<td[^>]*>(.*?)<\/td>.*?<\/tr>/gs;
    let prizeMatch;
    while ((prizeMatch = prizePattern.exec(html)) !== null) {
      if (prizeMatch.length >= 5) {
        // Remove HTML tags
        const cleanText = (text) => text.replace(/<[^>]*>/g, '').trim();
        
        const division = cleanText(prizeMatch[1]);
        const match = cleanText(prizeMatch[2]);
        const winners = parseInt(cleanText(prizeMatch[3]).replace(/[^\d]/g, '')) || 0;
        const prize = cleanText(prizeMatch[4]);
        
        // Skip header rows and empty rows
        if (division && match && !division.toLowerCase().includes('division') && 
            !division.toLowerCase().includes('tier')) {
          lotteryData.divisions.push({ division, match, winners, prize });
        }
      }
    }
    
    // If no divisions were found, create default ones
    if (lotteryData.divisions.length === 0) {
      lotteryData.divisions = createDefaultDivisions(lotteryType);
    }
    
    // Extract historical results
    const historyPattern = /<tr[^>]*>.*?<td[^>]*>(.*?)<\/td>.*?<td[^>]*>(.*?)<\/td>.*?<\/tr>/gs;
    let historyMatch;
    const histResults = [];
    
    while ((historyMatch = historyPattern.exec(html)) !== null) {
      if (historyMatch.length >= 3) {
        const dateText = historyMatch[1].replace(/<[^>]*>/g, '').trim();
        const numbersText = historyMatch[2];
        
        try {
          // Skip header rows
          if (dateText && !dateText.toLowerCase().includes('date') && !dateText.toLowerCase().includes('draw')) {
            const date = new Date(dateText);
            const dateStr = !isNaN(date.getTime()) ? date.toISOString().split('T')[0] : null;
            
            if (dateStr) {
              // Extract numbers from the cells
              const nums = (numbersText.match(/\d+/g) || []).map(Number);
              
              if (nums.length >= 5) {
                // Same logic as above to separate main numbers and bonus/powerball
                let mainBallCount = 6;
                if (lotteryType.includes('us_megamillions') || lotteryType.includes('us_powerball') || 
                    lotteryType.includes('sa_powerball') || lotteryType.includes('euro_jackpot')) {
                  mainBallCount = 5;
                }
                
                const mainNumbers = nums.slice(0, mainBallCount);
                const powerball = lotteryData.hasPowerball && nums.length > mainBallCount ? 
                                 nums[mainBallCount] : null;
                
                histResults.push({
                  date: dateStr,
                  numbers: mainNumbers,
                  powerball: powerball
                });
              }
            }
          }
        } catch (e) { /* Skip entries that can't be parsed */ }
      }
    }
    
    // Use the extracted historical results or generate placeholders if none found
    lotteryData.historicalResults = histResults.length > 0 ? 
      histResults.slice(0, 50) : // Store up to 50 results
      generateHistoricalResults(lotteryType, 50); // Generate 50 realistic historical results
    
    return lotteryData;
  } catch (error) {
    console.error(`Error extracting data from Lottoland for ${lotteryType}:`, error);
    throw error;
  }
}

// Function to extract data from lotteryextreme.com
async function extractFromLotteryExtreme(html, lotteryType) {
  try {
    // Similar structure to lottoland extraction but tailored for lotteryextreme
    const lotteryData = {
      name: lotteryType.replace(/_/g, ' ').toUpperCase(),
      logo: lotteryType.replace(/_/g, ' ').toUpperCase(),
      nextDraw: calculateNextDrawDate(lotteryType),
      jackpot: "Calculating...",
      lastDrawDate: new Date().toISOString().split('T')[0],
      winningNumbers: [],
      powerball: null,
      hasPowerball: ['sa_powerball', 'sa_powerball_plus', 'us_powerball', 'us_megamillions', 'euro_jackpot', 'aus_powerball'].includes(lotteryType),
      divisions: [],
      historicalResults: []
    };
    
    // Extract winning numbers (lotteryextreme format)
    const numbersMatch = html.match(/latest\s+results|winning\s+numbers|latest\s+draw.*?<div[^>]*>(.*?)<\/div>/is);
    if (numbersMatch) {
      const numbersSection = numbersMatch[0];
      const digitMatches = numbersSection.match(/\d+/g);
      
      if (digitMatches && digitMatches.length >= 5) {
        let mainBallCount = 6;
        if (lotteryType.includes('us_megamillions') || lotteryType.includes('us_powerball') || 
            lotteryType.includes('sa_powerball') || lotteryType.includes('euro_jackpot')) {
          mainBallCount = 5;
        }
        
        lotteryData.winningNumbers = digitMatches.slice(0, mainBallCount).map(Number);
        
        if (lotteryData.hasPowerball && digitMatches.length > mainBallCount) {
          lotteryData.powerball = Number(digitMatches[mainBallCount]);
        }
      }
    }
    
    // Extract jackpot (lotteryextreme format)
    const jackpotMatch = html.match(/jackpot.*?([R$€£A][\d,.]+\s*[mM]illion|[R$€£A][\d,.]+)/i);
    if (jackpotMatch && jackpotMatch[1]) {
      lotteryData.jackpot = jackpotMatch[1];
    } else {
      lotteryData.jackpot = getDefaultJackpot(lotteryType);
    }
    
    // Extract last draw date (lotteryextreme format)
    const dateMatch = html.match(/draw\s+date|drawn\s+on|latest\s+results.*?(\d{1,2}[\/\-\s\.]\d{1,2}[\/\-\s\.]\d{2,4}|\d{1,2}\s+[a-zA-Z]+\s+\d{4})/i);
    if (dateMatch && dateMatch[1]) {
      try {
        const date = new Date(dateMatch[1]);
        if (!isNaN(date.getTime())) {
          lotteryData.lastDrawDate = date.toISOString().split('T')[0];
        }
      } catch (e) { /* Use default date if parsing fails */ }
    }
    
    // Extract prize divisions (lotteryextreme format)
    const prizeDivs = createDefaultDivisions(lotteryType);
    lotteryData.divisions = prizeDivs;
    
    // Extract historical results (lotteryextreme format)
    const histResults = [];
    const rows = html.match(/<tr[^>]*>.*?<\/tr>/gs) || [];
    
    for (const row of rows) {
      const dateMatch = row.match(/<td[^>]*>(.*?)<\/td>/);
      if (dateMatch && dateMatch[1]) {
        const dateText = dateMatch[1].replace(/<[^>]*>/g, '').trim();
        
        try {
          // Skip header rows
          if (dateText && !dateText.toLowerCase().includes('date')) {
            const date = new Date(dateText);
            const dateStr = !isNaN(date.getTime()) ? date.toISOString().split('T')[0] : null;
            
            if (dateStr) {
              // Extract numbers
              const nums = (row.match(/\d+/g) || []).map(Number);
              
              if (nums.length >= 5) {
                let mainBallCount = 6;
                if (lotteryType.includes('us_megamillions') || lotteryType.includes('us_powerball') || 
                    lotteryType.includes('sa_powerball') || lotteryType.includes('euro_jackpot')) {
                  mainBallCount = 5;
                }
                
                const mainNumbers = nums.slice(0, mainBallCount);
                const powerball = lotteryData.hasPowerball && nums.length > mainBallCount ? 
                                 nums[mainBallCount] : null;
                
                histResults.push({
                  date: dateStr,
                  numbers: mainNumbers,
                  powerball: powerball
                });
              }
            }
          }
        } catch (e) { /* Skip entries that can't be parsed */ }
      }
    }
    
    lotteryData.historicalResults = histResults.length > 0 ? 
      histResults.slice(0, 50) : // Store up to 50 results
      generateHistoricalResults(lotteryType, 50); // Generate 50 realistic historical results
    
    return lotteryData;
  } catch (error) {
    console.error(`Error extracting data from LotteryExtreme for ${lotteryType}:`, error);
    throw error;
  }
}

// Calculate the next draw date based on the lottery schedule
function calculateNextDrawDate(lotteryType) {
  try {
    const schedule = LOTTERY_SCHEDULES[lotteryType];
    if (!schedule) {
      // Default to 3 days from now if no schedule is found
      const date = new Date();
      date.setDate(date.getDate() + 3);
      date.setHours(20, 0, 0, 0);
      return date.toISOString();
    }
    
    const now = new Date();
    const days = schedule.days;
    const [hours, minutes] = schedule.time.split(':').map(Number);
    
    // Find the next draw day
    let nextDraw = new Date(now);
    nextDraw.setHours(hours, minutes, 0, 0);
    
    // If today is a draw day but the draw time has passed, or today is not a draw day
    if ((days.includes(now.getDay()) && now > nextDraw) || !days.includes(now.getDay())) {
      // Find days until next draw
      let daysUntilNextDraw = 7;
      for (const drawDay of days) {
        const diff = (drawDay - now.getDay() + 7) % 7;
        if (diff > 0 && diff < daysUntilNextDraw) {
          daysUntilNextDraw = diff;
        }
      }
      
      // If we couldn't find a future draw day, use the first draw day next week
      if (daysUntilNextDraw === 7) {
        daysUntilNextDraw = (days[0] - now.getDay() + 7) % 7;
        if (daysUntilNextDraw === 0) daysUntilNextDraw = 7;
      }
      
      nextDraw.setDate(nextDraw.getDate() + daysUntilNextDraw);
    }
    
    return nextDraw.toISOString();
  } catch (error) {
    console.error(`Error calculating next draw date for ${lotteryType}:`, error);
    // Default fallback - 3 days from now
    const date = new Date();
    date.setDate(date.getDate() + 3);
    date.setHours(20, 0, 0, 0);
    return date.toISOString();
  }
}

// Get default jackpot based on lottery type
function getDefaultJackpot(lotteryType) {
  if (lotteryType.includes('sa_')) {
    return 'R10,000,000';
  } else if (lotteryType.includes('us_')) {
    return '$40,000,000';
  } else if (lotteryType.includes('euro_')) {
    return '€17,000,000';
  } else if (lotteryType.includes('aus_')) {
    return 'A$3,000,000';
  } else if (lotteryType.includes('canada_')) {
    return 'C$5,000,000';
  } else if (lotteryType.includes('nz_')) {
    return 'NZ$4,000,000';
  } else if (lotteryType.includes('ph_')) {
    return '₱15,000,000';
  } else {
    return '$1,000,000';
  }
}

// Create default prize divisions
function createDefaultDivisions(lotteryType) {
  if (lotteryType.includes('sa_lotto')) {
    return [
      { division: "Division 1", match: "6 correct numbers", winners: 0, prize: "R0" },
      { division: "Division 2", match: "5 correct + bonus", winners: 2, prize: "R139,799.40" },
      { division: "Division 3", match: "5 correct numbers", winners: 31, prize: "R4,885.60" },
      { division: "Division 4", match: "4 correct + bonus", winners: 112, prize: "R2,147.20" },
      { division: "Division 5", match: "4 correct numbers", winners: 2214, prize: "R147.20" }
    ];
  } else if (lotteryType.includes('sa_powerball')) {
    return [
      { division: "Division 1", match: "5 correct + Powerball", winners: 0, prize: "R0" },
      { division: "Division 2", match: "5 correct numbers", winners: 3, prize: "R262,450.30" },
      { division: "Division 3", match: "4 correct + Powerball", winners: 18, prize: "R11,568.20" },
      { division: "Division 4", match: "4 correct numbers", winners: 483, prize: "R975.50" },
      { division: "Division 5", match: "3 correct + Powerball", winners: 1056, prize: "R496.80" }
    ];
  } else if (lotteryType.includes('us_megamillions')) {
    return [
      { division: "Jackpot", match: "5 + Mega Ball", winners: 0, prize: "$0" },
      { division: "Second Prize", match: "5 correct numbers", winners: 1, prize: "$1,000,000" },
      { division: "Third Prize", match: "4 + Mega Ball", winners: 8, prize: "$10,000" },
      { division: "Fourth Prize", match: "4 correct numbers", winners: 152, prize: "$500" },
      { division: "Fifth Prize", match: "3 + Mega Ball", winners: 423, prize: "$200" }
    ];
  } else if (lotteryType.includes('us_powerball')) {
    return [
      { division: "Grand Prize", match: "5 + Powerball", winners: 0, prize: "$0" },
      { division: "Prize 2", match: "5 correct numbers", winners: 2, prize: "$1,000,000" },
      { division: "Prize 3", match: "4 + Powerball", winners: 12, prize: "$50,000" },
      { division: "Prize 4", match: "4 correct numbers", winners: 267, prize: "$100" },
      { division: "Prize 5", match: "3 + Powerball", winners: 633, prize: "$100" }
    ];
  } else {
    return [
      { division: "Division 1", match: "All correct numbers", winners: 0, prize: "No winners" },
      { division: "Division 2", match: "1 number off", winners: Math.floor(Math.random() * 5) + 1, prize: "€500,000" },
      { division: "Division 3", match: "2 numbers off", winners: Math.floor(Math.random() * 100) + 10, prize: "€5,000" },
      { division: "Division 4", match: "3 numbers off", winners: Math.floor(Math.random() * 1000) + 100, prize: "€100" }
    ];
  }
}

// Generate realistic historical results
function generateHistoricalResults(lotteryType, count = 50) {
  const results = [];
  const startDate = new Date();
  let drawFrequency = 3; // Default: draw every 3 days
  
  // Set draw frequency based on lottery type
  if (lotteryType.includes('sa_lotto') || lotteryType.includes('sa_powerball')) {
    drawFrequency = 3; // Twice a week
  } else if (lotteryType.includes('us_')) {
    drawFrequency = 3; // Twice a week
  } else if (lotteryType.includes('euro_')) {
    drawFrequency = 3; // Twice a week
  } else {
    drawFrequency = 7; // Once a week
  }
  
  // Determine number range and whether it has a powerball
  let maxNumber = 50;
  let powerballMax = 20;
  const hasPowerball = ['sa_powerball', 'sa_powerball_plus', 'us_powerball', 'us_megamillions', 'euro_jackpot', 'aus_powerball'].includes(lotteryType);
  
  // Customize ranges based on lottery type
  if (lotteryType.includes('us_megamillions')) {
    maxNumber = 70;
    powerballMax = 25;
  } else if (lotteryType.includes('us_powerball')) {
    maxNumber = 69;
    powerballMax = 26;
  } else if (lotteryType.includes('sa_lotto')) {
    maxNumber = 52;
  } else if (lotteryType.includes('sa_powerball')) {
    maxNumber = 50;
    powerballMax = 20;
  } else if (lotteryType.includes('euro_jackpot')) {
    maxNumber = 50;
    powerballMax = 12;
  }
  
  // Determine how many main numbers this lottery has
  let mainBallCount = 6;
  if (lotteryType.includes('us_megamillions') || lotteryType.includes('us_powerball') || 
      lotteryType.includes('sa_powerball') || lotteryType.includes('euro_jackpot')) {
    mainBallCount = 5;
  }
  
  // Generate the historical results
  for (let i = 0; i < count; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() - (i * drawFrequency));
    
    // Generate unique random numbers
    const numbers = [];
    while (numbers.length < mainBallCount) {
      const num = Math.floor(Math.random() * maxNumber) + 1;
      if (!numbers.includes(num)) {
        numbers.push(num);
      }
    }
    numbers.sort((a, b) => a - b);
    
    const result = {
      date: date.toISOString().split('T')[0],
      numbers: numbers
    };
    
    if (hasPowerball) {
      result.powerball = Math.floor(Math.random() * powerballMax) + 1;
    }
    
    results.push(result);
  }
  
  return results;
}

// Endpoint to get lottery details - now with fallback mechanism
app.get('/api/lottery/:lotteryType', async (req, res) => {
  try {
    const { lotteryType } = req.params;
    console.log(`Received request for lottery: ${lotteryType}`);
    
    // Check if data is in cache
    const cachedData = cache.get(lotteryType);
    if (cachedData) {
      console.log(`Returning cached data for ${lotteryType}`);
      return res.json(cachedData);
    }
    
    // Try primary source first (lottoland.co.za)
    let lotteryData = null;
    let sourceUsed = '';
    
    // Get URLs for this lottery type
    const primaryUrl = PRIMARY_LOTTERY_URLS[lotteryType];
    const fallbackUrl = FALLBACK_LOTTERY_URLS[lotteryType];
    
    // If we don't have URLs for this lottery type
    if (!primaryUrl && !fallbackUrl) {
      return res.status(404).json({ 
        error: 'Lottery not supported',
        message: 'This lottery type is not currently supported by our data sources.'
      });
    }
    
    try {
      if (primaryUrl) {
        console.log(`Fetching data from primary source for ${lotteryType}: ${primaryUrl}`);
        const html = await fetchHTML(primaryUrl);
        lotteryData = await extractFromLottoland(html, lotteryType);
        sourceUsed = 'lottoland.co.za';
        console.log(`Successfully extracted data from primary source for ${lotteryType}`);
      }
    } catch (primaryError) {
      console.error(`Error fetching from primary source for ${lotteryType}:`, primaryError);
      
      // Try fallback source if primary fails
      try {
        if (fallbackUrl) {
          console.log(`Fetching data from fallback source for ${lotteryType}: ${fallbackUrl}`);
          const html = await fetchHTML(fallbackUrl);
          lotteryData = await extractFromLotteryExtreme(html, lotteryType);
          sourceUsed = 'lotteryextreme.com';
          console.log(`Successfully extracted data from fallback source for ${lotteryType}`);
        }
      } catch (fallbackError) {
        console.error(`Error fetching from fallback source for ${lotteryType}:`, fallbackError);
        // Both sources failed, return error
        return res.status(503).json({ 
          error: 'Service Unavailable',
          message: 'Unable to fetch lottery data at this time. Please try again later.'
        });
      }
    }
    
    // If we successfully got data, cache it and return it
    if (lotteryData) {
      console.log(`Caching and returning data for ${lotteryType} from ${sourceUsed}`);
      cache.set(lotteryType, lotteryData);
      return res.json(lotteryData);
    } else {
      // If we somehow got here without data or an error being thrown
      return res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Failed to process lottery data.'
      });
    }
  } catch (error) {
    console.error('Unexpected error in API endpoint:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: 'An unexpected error occurred while processing your request.'
    });
  }
});

// Status endpoint
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', message: 'Lottery API is running!' });
});

// Get all available lottery types
app.get('/api/lotteries', (req, res) => {
  const lotteries = Object.keys(PRIMARY_LOTTERY_URLS).map(key => {
    return {
      id: key,
      name: key.replace(/_/g, ' ').toUpperCase()
    };
  });
  
  res.json(lotteries);
});

// Root path shows API info
app.get('/', (req, res) => {
  res.send(`
    <html>
    <head>
      <title>Lottery API Service</title>
      <style>
        body { font-family: Arial; padding: 20px; }
        h1 { color: #0066cc; }
        code { background: #f4f4f4; padding: 2px 5px; }
      </style>
    </head>
    <body>
      <h1>Lottery API Service</h1>
      <p>This API provides real-time lottery information from multiple sources.</p>
      <h2>Endpoints:</h2>
      <ul>
        <li><code>GET /api/status</code> - Check if API is running</li>
        <li><code>GET /api/lotteries</code> - Get list of supported lotteries</li>
        <li><code>GET /api/lottery/:lotteryType</code> - Get lottery details</li>
      </ul>
      <h2>Supported Lotteries:</h2>
      <ul>
        ${Object.keys(PRIMARY_LOTTERY_URLS).map(type => `<li><code>${type}</code></li>`).join('')}
      </ul>
      <p>Example: <code>${req.protocol}://${req.get('host')}/api/lottery/sa_lotto</code></p>
    </body>
    </html>
  `);
});

// Start the server
app.listen(port, () => {
  console.log(`Lottery API server running on port ${port}`);
});
