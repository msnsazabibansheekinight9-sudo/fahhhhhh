// ============================================================================
// TERMINAL — the instrument universe. Stocks, ETFs, treasuries and credit,
// futures, FX and crypto, each with the fundamental fields the analyst council
// needs (it cannot run Piotroski without a cash-flow statement).
//
// Prices and fundamentals here are MODELLED, derived deterministically from the
// ticker so they never change between reloads, anchored on sector medians and
// on real share counts and sector weights for the large caps. They are badged
// SIM everywhere until a provider overwrites them. Paste a key in Sources and
// the real values replace these field by field.
// ============================================================================
'use strict';
(function () {
const U = M.Universe = { list: [], bySym: {}, sectors: {}, types: {} };

// sym, name, sector, industry, price, shares (millions), beta, dividend yield %
const STOCKS = [
['AAPL','Apple Inc.','Technology','Consumer Electronics',242.80,14840,1.18,0.42],
['MSFT','Microsoft Corp.','Technology','Software — Infrastructure',428.15,7430,0.92,0.76],
['NVDA','NVIDIA Corp.','Technology','Semiconductors',181.40,24400,2.14,0.02],
['GOOGL','Alphabet Inc. Class A','Communication','Internet Content',252.60,12050,1.04,0.33],
['AMZN','Amazon.com Inc.','Consumer Discretionary','Internet Retail',228.90,10600,1.22,0.00],
['META','Meta Platforms Inc.','Communication','Social Media',612.40,2520,1.26,0.34],
['AVGO','Broadcom Inc.','Technology','Semiconductors',338.70,4700,1.16,0.72],
['TSLA','Tesla Inc.','Consumer Discretionary','Auto Manufacturers',418.30,3210,2.31,0.00],
['BRK.B','Berkshire Hathaway Class B','Financials','Insurance — Diversified',486.20,2160,0.84,0.00],
['LLY','Eli Lilly and Co.','Healthcare','Drug Manufacturers',874.50,950,0.46,0.63],
['JPM','JPMorgan Chase & Co.','Financials','Banks — Diversified',287.40,2790,1.09,1.98],
['V','Visa Inc. Class A','Financials','Credit Services',334.80,1930,0.96,0.72],
['UNH','UnitedHealth Group','Healthcare','Healthcare Plans',338.90,920,0.58,2.48],
['XOM','Exxon Mobil Corp.','Energy','Oil & Gas Integrated',118.60,4350,0.88,3.34],
['MA','Mastercard Inc.','Financials','Credit Services',548.20,915,1.04,0.54],
['COST','Costco Wholesale','Consumer Staples','Discount Stores',912.40,444,0.80,0.52],
['HD','Home Depot Inc.','Consumer Discretionary','Home Improvement',392.70,994,1.02,2.30],
['PG','Procter & Gamble','Consumer Staples','Household Products',158.30,2355,0.42,2.56],
['JNJ','Johnson & Johnson','Healthcare','Drug Manufacturers',162.80,2408,0.52,3.07],
['WMT','Walmart Inc.','Consumer Staples','Discount Stores',96.40,8040,0.62,0.88],
['ABBV','AbbVie Inc.','Healthcare','Drug Manufacturers',198.40,1768,0.58,3.19],
['ORCL','Oracle Corp.','Technology','Software — Infrastructure',186.90,2800,1.10,0.86],
['CRM','Salesforce Inc.','Technology','Software — Application',334.60,962,1.28,0.48],
['BAC','Bank of America','Financials','Banks — Diversified',46.80,7700,1.32,2.22],
['KO','Coca-Cola Co.','Consumer Staples','Beverages',68.90,4310,0.58,2.86],
['PEP','PepsiCo Inc.','Consumer Staples','Beverages',158.20,1372,0.52,3.42],
['AMD','Advanced Micro Devices','Technology','Semiconductors',164.80,1620,1.86,0.00],
['NFLX','Netflix Inc.','Communication','Entertainment',842.50,428,1.24,0.00],
['ADBE','Adobe Inc.','Technology','Software — Application',498.30,440,1.30,0.00],
['MRK','Merck & Co.','Healthcare','Drug Manufacturers',98.40,2530,0.42,3.24],
['CVX','Chevron Corp.','Energy','Oil & Gas Integrated',158.20,1810,0.94,4.12],
['TMO','Thermo Fisher Scientific','Healthcare','Diagnostics & Research',548.90,383,0.86,0.30],
['LIN','Linde plc','Materials','Specialty Chemicals','462.10',478,0.96,1.22],
['ACN','Accenture plc','Technology','IT Services',348.60,628,1.08,1.68],
['CSCO','Cisco Systems','Technology','Communication Equipment',58.40,3980,0.88,2.74],
['ABT','Abbott Laboratories','Healthcare','Medical Devices',118.70,1740,0.74,1.86],
['MCD',"McDonald's Corp.",'Consumer Discretionary','Restaurants',298.40,716,0.68,2.32],
['WFC','Wells Fargo & Co.','Financials','Banks — Diversified',72.60,3320,1.18,2.20],
['DHR','Danaher Corp.','Healthcare','Diagnostics & Research',238.50,718,0.88,0.46],
['GE','GE Aerospace','Industrials','Aerospace & Defense','194.80',1080,1.14,0.58],
['INTU','Intuit Inc.','Technology','Software — Application',642.30,280,1.22,0.58],
['TXN','Texas Instruments','Technology','Semiconductors',198.40,912,1.04,2.74],
['VZ','Verizon Communications','Communication','Telecom Services',42.30,4210,0.38,6.38],
['QCOM','QUALCOMM Inc.','Technology','Semiconductors',168.90,1110,1.26,1.98],
['IBM','International Business Machines','Technology','IT Services',228.40,925,0.78,2.92],
['AMGN','Amgen Inc.','Healthcare','Drug Manufacturers',298.60,538,0.62,3.18],
['CAT','Caterpillar Inc.','Industrials','Farm & Heavy Machinery',398.70,484,1.08,1.42],
['PM','Philip Morris International','Consumer Staples','Tobacco',128.40,1556,0.56,4.16],
['NOW','ServiceNow Inc.','Technology','Software — Application',962.40,206,1.18,0.00],
['SPGI','S&P Global Inc.','Financials','Financial Data',512.80,310,1.12,0.72],
['GS','Goldman Sachs Group','Financials','Capital Markets',568.40,318,1.36,2.08],
['ISRG','Intuitive Surgical','Healthcare','Medical Instruments',528.60,356,1.44,0.00],
['RTX','RTX Corp.','Industrials','Aerospace & Defense',124.80,1332,0.72,2.02],
['HON','Honeywell International','Industrials','Conglomerates',218.40,650,1.02,2.06],
['UNP','Union Pacific Corp.','Industrials','Railroads',238.50,606,1.06,2.22],
['BKNG','Booking Holdings','Consumer Discretionary','Travel Services',4820.00,33,1.32,0.72],
['T','AT&T Inc.','Communication','Telecom Services',22.80,7170,0.56,4.88],
['NEE','NextEra Energy','Utilities','Utilities — Regulated',78.40,2056,0.58,2.72],
['LOW',"Lowe's Companies",'Consumer Discretionary','Home Improvement',262.30,566,1.06,1.78],
['BLK','BlackRock Inc.','Financials','Asset Management',1012.40,148,1.26,2.06],
['SCHW','Charles Schwab Corp.','Financials','Capital Markets',78.60,1810,1.08,1.34],
['PFE','Pfizer Inc.','Healthcare','Drug Manufacturers',26.40,5670,0.64,6.36],
['UBER','Uber Technologies','Industrials','Software — Application',72.40,2096,1.40,0.00],
['COP','ConocoPhillips','Energy','Oil & Gas E&P',108.60,1162,1.06,2.88],
['BA','Boeing Co.','Industrials','Aerospace & Defense',178.40,752,1.48,0.00],
['DE','Deere & Co.','Industrials','Farm & Heavy Machinery',458.20,274,1.02,1.32],
['ELV','Elevance Health','Healthcare','Healthcare Plans',398.40,232,0.62,1.64],
['PLD','Prologis Inc.','Real Estate','REIT — Industrial',112.80,926,1.08,3.42],
['SYK','Stryker Corp.','Healthcare','Medical Devices',382.60,382,0.94,0.86],
['ADP','Automatic Data Processing','Industrials','Staffing & Employment',298.40,408,0.82,2.02],
['MDT','Medtronic plc','Healthcare','Medical Devices',88.60,1282,0.76,3.16],
['LMT','Lockheed Martin','Industrials','Aerospace & Defense',542.80,238,0.48,2.42],
['CB','Chubb Ltd.','Financials','Insurance — P&C','282.40',404,0.64,1.32],
['MMC','Marsh & McLennan','Financials','Insurance Brokers',218.40,492,0.78,1.48],
['PANW','Palo Alto Networks','Technology','Software — Infrastructure',388.60,324,1.22,0.00],
['MU','Micron Technology','Technology','Semiconductors',108.40,1112,1.62,0.42],
['AMAT','Applied Materials','Technology','Semiconductor Equipment',188.60,818,1.58,0.88],
['LRCX','Lam Research','Technology','Semiconductor Equipment',78.40,1280,1.62,1.02],
['KLAC','KLA Corp.','Technology','Semiconductor Equipment',698.40,133,1.48,0.86],
['SBUX','Starbucks Corp.','Consumer Discretionary','Restaurants',98.60,1134,0.98,2.48],
['GILD','Gilead Sciences','Healthcare','Biotechnology','98.40',1246,0.42,3.14],
['CI','Cigna Group','Healthcare','Healthcare Plans',318.60,274,0.58,1.86],
['MO','Altria Group','Consumer Staples','Tobacco',54.20,1690,0.54,7.42],
['SO','Southern Co.','Utilities','Utilities — Regulated',88.40,1096,0.52,3.26],
['DUK','Duke Energy','Utilities','Utilities — Regulated',116.80,772,0.48,3.58],
['ZTS','Zoetis Inc.','Healthcare','Drug Manufacturers — Specialty',172.40,452,0.92,1.02],
['REGN','Regeneron Pharmaceuticals','Healthcare','Biotechnology',728.40,108,0.52,0.00],
['VRTX','Vertex Pharmaceuticals','Healthcare','Biotechnology',462.80,258,0.38,0.00],
['ETN','Eaton Corp. plc','Industrials','Specialty Industrial',328.40,398,1.14,1.12],
['ITW','Illinois Tool Works','Industrials','Specialty Industrial',258.60,298,0.96,2.26],
['CSX','CSX Corp.','Industrials','Railroads',34.80,1930,1.06,1.42],
['NSC','Norfolk Southern','Industrials','Railroads',248.60,226,1.14,2.18],
['FDX','FedEx Corp.','Industrials','Integrated Freight',272.40,242,1.16,2.04],
['UPS','United Parcel Service','Industrials','Integrated Freight',128.60,854,1.02,5.08],
['DAL','Delta Air Lines','Industrials','Airlines','58.40',644,1.42,1.02],
['MAR','Marriott International','Consumer Discretionary','Lodging',268.40,280,1.42,0.92],
['NKE','NIKE Inc.','Consumer Discretionary','Footwear & Accessories',74.80,1480,1.06,2.12],
['TGT','Target Corp.','Consumer Staples','Discount Stores',132.60,458,1.08,3.38],
['KR','Kroger Co.','Consumer Staples','Grocery Stores',62.40,728,0.52,2.02],
['GM','General Motors','Consumer Discretionary','Auto Manufacturers',52.80,1048,1.44,0.92],
['F','Ford Motor Co.','Consumer Discretionary','Auto Manufacturers',10.80,3980,1.52,5.56],
['RIVN','Rivian Automotive','Consumer Discretionary','Auto Manufacturers',12.40,1012,2.18,0.00],
['LCID','Lucid Group','Consumer Discretionary','Auto Manufacturers',2.48,2980,2.42,0.00],
['PLTR','Palantir Technologies','Technology','Software — Infrastructure',62.80,2280,2.68,0.00],
['SNOW','Snowflake Inc.','Technology','Software — Infrastructure',168.40,334,1.46,0.00],
['DDOG','Datadog Inc.','Technology','Software — Application',138.60,342,1.38,0.00],
['NET','Cloudflare Inc.','Technology','Software — Infrastructure',108.40,346,1.72,0.00],
['CRWD','CrowdStrike Holdings','Technology','Software — Infrastructure',348.60,246,1.28,0.00],
['SHOP','Shopify Inc.','Technology','Software — Application',108.60,1292,2.04,0.00],
['SQ','Block Inc.','Technology','Software — Infrastructure',78.40,618,2.36,0.00],
['PYPL','PayPal Holdings','Financials','Credit Services',82.60,1012,1.42,0.00],
['COIN','Coinbase Global','Financials','Capital Markets',288.40,254,3.12,0.00],
['HOOD','Robinhood Markets','Financials','Capital Markets',42.80,884,2.28,0.00],
['SOFI','SoFi Technologies','Financials','Credit Services',14.80,1098,2.02,0.00],
['MSTR','MicroStrategy Inc.','Technology','Software — Application',348.60,228,3.84,0.00],
['MARA','MARA Holdings','Financials','Capital Markets',18.40,348,4.12,0.00],
['RIOT','Riot Platforms','Financials','Capital Markets',12.80,342,4.28,0.00],
['SMCI','Super Micro Computer','Technology','Computer Hardware',38.60,596,2.14,0.00],
['DELL','Dell Technologies','Technology','Computer Hardware',128.40,702,1.34,1.52],
['HPQ','HP Inc.','Technology','Computer Hardware',34.20,952,1.12,3.28],
['INTC','Intel Corp.','Technology','Semiconductors',24.80,4310,1.28,0.00],
['ARM','Arm Holdings plc','Technology','Semiconductors',138.60,1052,1.84,0.00],
['TSM','Taiwan Semiconductor ADR','Technology','Semiconductors',208.40,5186,1.26,1.08],
['ASML','ASML Holding ADR','Technology','Semiconductor Equipment',742.80,393,1.34,0.92],
['NVO','Novo Nordisk ADR','Healthcare','Drug Manufacturers',98.60,4460,0.48,1.68],
['BABA','Alibaba Group ADR','Consumer Discretionary','Internet Retail',108.40,2380,0.62,1.02],
['PDD','PDD Holdings ADR','Consumer Discretionary','Internet Retail',122.60,1386,0.72,0.00],
['JD','JD.com ADR','Consumer Discretionary','Internet Retail',38.40,1452,0.58,2.68],
['SHEL','Shell plc ADR','Energy','Oil & Gas Integrated',68.40,3086,0.86,3.88],
['BP','BP plc ADR','Energy','Oil & Gas Integrated',32.80,2680,0.92,5.84],
['TTE','TotalEnergies ADR','Energy','Oil & Gas Integrated',58.60,2320,0.84,5.12],
['OXY','Occidental Petroleum','Energy','Oil & Gas E&P',48.60,938,1.24,1.82],
['SLB','Schlumberger NV','Energy','Oil & Gas Equipment',38.40,1416,1.32,2.86],
['HAL','Halliburton Co.','Energy','Oil & Gas Equipment',24.80,874,1.46,2.74],
['EOG','EOG Resources','Energy','Oil & Gas E&P',124.60,560,1.08,3.12],
['PSX','Phillips 66','Energy','Oil & Gas Refining',128.40,418,1.14,3.62],
['VLO','Valero Energy','Energy','Oil & Gas Refining',138.60,316,1.18,3.08],
['KMI','Kinder Morgan','Energy','Oil & Gas Midstream',28.40,2220,0.88,4.08],
['WMB','Williams Companies','Energy','Oil & Gas Midstream',58.20,1220,0.92,3.28],
['FCX','Freeport-McMoRan','Materials','Copper',48.60,1438,1.62,1.24],
['NEM','Newmont Corp.','Materials','Gold',58.40,1136,0.84,1.72],
['GOLD','Barrick Gold Corp.','Materials','Gold',22.80,1752,0.78,1.78],
['NUE','Nucor Corp.','Materials','Steel',138.40,236,1.22,1.52],
['DOW','Dow Inc.','Materials','Chemicals',38.60,704,1.28,7.24],
['APD','Air Products & Chemicals','Materials','Specialty Chemicals',312.40,222,0.88,2.26],
['SHW','Sherwin-Williams','Materials','Specialty Chemicals',348.60,252,1.08,0.84],
['AMT','American Tower Corp.','Real Estate','REIT — Specialty',198.40,466,0.84,3.28],
['SPG','Simon Property Group','Real Estate','REIT — Retail',172.40,326,1.44,4.82],
['O','Realty Income Corp.','Real Estate','REIT — Retail',58.60,872,0.86,5.42],
['EQIX','Equinix Inc.','Real Estate','REIT — Data Center','888.40',96,0.86,1.92],
['AVB','AvalonBay Communities','Real Estate','REIT — Residential',208.60,142,0.92,3.32],
['WELL','Welltower Inc.','Real Estate','REIT — Healthcare','138.60',624,0.94,2.02],
['DIS','Walt Disney Co.','Communication','Entertainment',98.40,1812,1.26,1.02],
['CMCSA','Comcast Corp.','Communication','Telecom Services',38.60,3830,0.92,3.32],
['WBD','Warner Bros. Discovery','Communication','Entertainment',11.80,2452,1.42,0.00],
['PARA','Paramount Skydance','Communication','Entertainment',16.40,692,1.56,0.00],
['SPOT','Spotify Technology','Communication','Entertainment',488.60,204,1.62,0.00],
['RBLX','Roblox Corp.','Communication','Electronic Gaming',68.40,654,2.04,0.00],
['EA','Electronic Arts','Communication','Electronic Gaming',158.40,254,0.86,0.48],
['TTWO','Take-Two Interactive','Communication','Electronic Gaming',198.60,178,1.08,0.00],
['LUV','Southwest Airlines','Industrials','Airlines',32.40,590,1.18,2.24],
['AAL','American Airlines Group','Industrials','Airlines',14.80,660,1.62,0.00],
['CCL','Carnival Corp.','Consumer Discretionary','Travel Services',24.80,1278,2.24,0.00],
['ABNB','Airbnb Inc.','Consumer Discretionary','Travel Services',134.60,632,1.18,0.00],
['DASH','DoorDash Inc.','Consumer Discretionary','Internet Retail',178.40,418,1.54,0.00],
['LULU','Lululemon Athletica','Consumer Discretionary','Apparel Retail',318.40,122,1.32,0.00],
['CMG','Chipotle Mexican Grill','Consumer Discretionary','Restaurants',58.40,1364,1.14,0.00],
['YUM','Yum! Brands','Consumer Discretionary','Restaurants',138.60,280,0.96,1.96],
['MDLZ','Mondelez International','Consumer Staples','Confectioners',62.40,1322,0.58,2.82],
['CL','Colgate-Palmolive','Consumer Staples','Household Products',88.60,814,0.44,2.28],
['KMB','Kimberly-Clark','Consumer Staples','Household Products',132.40,334,0.46,3.72],
['GIS','General Mills','Consumer Staples','Packaged Foods',62.80,552,0.38,4.02],
['SYY','Sysco Corp.','Consumer Staples','Food Distribution',74.60,490,0.92,2.76],
['ADM','Archer-Daniels-Midland','Consumer Staples','Farm Products',52.40,482,0.86,3.88],
['AXP','American Express','Financials','Credit Services',288.40,706,1.22,0.98],
['C','Citigroup Inc.','Financials','Banks — Diversified',72.80,1890,1.38,2.98],
['MS','Morgan Stanley','Financials','Capital Markets',128.60,1612,1.32,2.84],
['USB','U.S. Bancorp','Financials','Banks — Regional',48.60,1560,1.08,4.12],
['PNC','PNC Financial Services','Financials','Banks — Regional',198.40,398,1.14,3.28],
['TFC','Truist Financial','Financials','Banks — Regional',44.80,1332,1.06,4.62],
['KEY','KeyCorp','Financials','Banks — Regional',18.40,1098,1.22,4.48],
['PGR','Progressive Corp.','Financials','Insurance — P&C',248.60,586,0.52,0.48],
['ALL','Allstate Corp.','Financials','Insurance — P&C',198.40,264,0.58,1.86],
['AIG','American International Group','Financials','Insurance — Diversified',78.60,604,0.96,2.06],
['MET','MetLife Inc.','Financials','Insurance — Life',82.40,700,0.98,2.72],
['AEP','American Electric Power','Utilities','Utilities — Regulated',102.40,534,0.44,3.52],
['EXC','Exelon Corp.','Utilities','Utilities — Regulated',42.60,1006,0.48,3.68],
['SRE','Sempra','Utilities','Utilities — Diversified',86.40,634,0.62,3.02],
['D','Dominion Energy','Utilities','Utilities — Regulated',58.40,842,0.54,4.58],
['VST','Vistra Corp.','Utilities','Utilities — Independent',148.60,340,1.28,0.62]
];

// ETFs and index trackers: symbol, name, class, price, expense %, yield %, what it holds
const ETFS = [
['SPY','SPDR S&P 500 ETF Trust','US Large Cap',612.40,0.0945,1.21,'500 US large caps, cap-weighted'],
['VOO','Vanguard S&P 500 ETF','US Large Cap',562.80,0.03,1.24,'Same index, cheapest major wrapper'],
['QQQ','Invesco QQQ Trust','US Growth',528.60,0.20,0.54,'Nasdaq-100, tech-heavy, no financials'],
['IWM','iShares Russell 2000 ETF','US Small Cap',232.40,0.19,1.12,'2000 US small caps'],
['DIA','SPDR Dow Jones Industrial Average','US Large Cap',442.80,0.16,1.54,'30 blue chips, price-weighted'],
['VTI','Vanguard Total Stock Market','US Total Market',298.60,0.03,1.26,'Effectively the whole US market'],
['VT','Vanguard Total World Stock','Global Equity',124.80,0.06,1.92,'US + developed + emerging in one line'],
['VEA','Vanguard FTSE Developed Markets','Intl Developed',52.40,0.05,3.02,'Europe, Japan, Australia, Canada'],
['VWO','Vanguard FTSE Emerging Markets','Emerging',48.60,0.08,2.86,'China, India, Taiwan, Brazil'],
['EFA','iShares MSCI EAFE ETF','Intl Developed',84.20,0.33,2.74,'Developed ex-US, the old standard'],
['EEM','iShares MSCI Emerging Markets','Emerging',46.80,0.70,2.42,'Emerging markets, pricier than VWO'],
['AGG','iShares Core US Aggregate Bond','US Bonds',98.40,0.03,3.88,'Investment-grade US bond market'],
['BND','Vanguard Total Bond Market','US Bonds',73.80,0.03,3.92,'Same job, Vanguard wrapper'],
['TLT','iShares 20+ Year Treasury Bond','Long Treasuries',88.60,0.15,4.22,'Long duration — the rate bet'],
['IEF','iShares 7-10 Year Treasury Bond','Mid Treasuries',95.20,0.15,3.96,'Belly of the curve'],
['SHY','iShares 1-3 Year Treasury Bond','Short Treasuries',82.60,0.15,4.12,'Cash-like, minimal duration'],
['BIL','SPDR 1-3 Month T-Bill ETF','T-Bills',91.60,0.1354,4.84,'Parking money at the front end'],
['TIP','iShares TIPS Bond ETF','Inflation-Linked',108.40,0.19,3.24,'Principal indexed to CPI'],
['LQD','iShares iBoxx Investment Grade','IG Credit',108.80,0.14,4.42,'Investment-grade corporate bonds'],
['HYG','iShares iBoxx High Yield','High Yield',79.80,0.49,6.84,'Junk credit — the risk-appetite tell'],
['JNK','SPDR Bloomberg High Yield Bond','High Yield',96.40,0.40,6.92,'Second high-yield benchmark'],
['EMB','iShares JP Morgan EM Bond','EM Debt',88.60,0.39,5.86,'Dollar-denominated EM sovereigns'],
['MUB','iShares National Muni Bond','Municipals',106.80,0.07,3.18,'Tax-exempt US municipals'],
['GLD','SPDR Gold Shares','Commodity',248.60,0.40,0.00,'Allocated physical gold'],
['IAU','iShares Gold Trust','Commodity',50.80,0.25,0.00,'Cheaper gold wrapper'],
['SLV','iShares Silver Trust','Commodity',30.40,0.50,0.00,'Physical silver'],
['DBC','Invesco DB Commodity Index','Commodity',22.80,0.87,3.42,'Broad commodity futures'],
['USO','United States Oil Fund','Commodity',74.60,0.60,0.00,'Front-month WTI, carries roll cost'],
['VNQ','Vanguard Real Estate ETF','REITs',92.40,0.13,3.86,'US listed property'],
['XLK','Technology Select Sector SPDR','Sector',248.60,0.09,0.62,'S&P 500 technology'],
['XLF','Financial Select Sector SPDR','Sector',50.40,0.09,1.42,'S&P 500 financials'],
['XLE','Energy Select Sector SPDR','Sector',92.60,0.09,3.24,'S&P 500 energy'],
['XLV','Health Care Select Sector SPDR','Sector',148.40,0.09,1.62,'S&P 500 healthcare'],
['XLI','Industrial Select Sector SPDR','Sector',142.80,0.09,1.42,'S&P 500 industrials'],
['XLP','Consumer Staples Select SPDR','Sector',80.60,0.09,2.52,'S&P 500 staples — the defensive leg'],
['XLU','Utilities Select Sector SPDR','Sector',82.40,0.09,2.88,'S&P 500 utilities'],
['SMH','VanEck Semiconductor ETF','Sector',268.40,0.35,0.42,'The 25 biggest chip names'],
['ARKK','ARK Innovation ETF','Thematic',68.40,0.75,0.00,'Concentrated high-beta growth'],
['SCHD','Schwab US Dividend Equity','Dividend',28.40,0.06,3.62,'Quality dividend screen'],
['VIG','Vanguard Dividend Appreciation','Dividend',202.60,0.05,1.72,'Companies that keep raising payouts']
];

// Treasuries and credit benchmarks: symbol, name, maturity years, yield %, coupon %
const BONDS = [
['US1M','US 1-Month T-Bill',0.083,4.82,0],
['US3M','US 3-Month T-Bill',0.25,4.76,0],
['US6M','US 6-Month T-Bill',0.5,4.58,0],
['US1Y','US 1-Year Treasury',1,4.32,4.25],
['US2Y','US 2-Year Treasury',2,4.06,4.00],
['US3Y','US 3-Year Treasury',3,3.98,4.00],
['US5Y','US 5-Year Treasury',5,4.02,4.00],
['US7Y','US 7-Year Treasury',7,4.14,4.125],
['US10Y','US 10-Year Treasury',10,4.28,4.25],
['US20Y','US 20-Year Treasury',20,4.62,4.625],
['US30Y','US 30-Year Treasury',30,4.54,4.50],
['USIG','US Investment Grade Corp (avg)',10.2,5.18,5.00],
['USHY','US High Yield Corp (avg)',6.4,7.42,7.00],
['MUNI','AAA Municipal 10Y',10,3.12,3.00]
];

// Futures and commodities: symbol, name, group, price, tick, contract size
const FUTURES = [
['ES','E-mini S&P 500','Index',6128.50,0.25,50],
['NQ','E-mini Nasdaq-100','Index',21840.00,0.25,20],
['YM','E-mini Dow','Index',44280,1,5],
['RTY','E-mini Russell 2000','Index',2318.40,0.10,50],
['CL','WTI Crude Oil','Energy',72.40,0.01,1000],
['BZ','Brent Crude Oil','Energy',76.20,0.01,1000],
['NG','Natural Gas','Energy',3.18,0.001,10000],
['GC','Gold','Metals',2648.40,0.10,100],
['SI','Silver','Metals',31.42,0.005,5000],
['HG','Copper','Metals',4.286,0.0005,25000],
['PL','Platinum','Metals',968.40,0.10,50],
['ZC','Corn','Agriculture',438.25,0.25,5000],
['ZW','Wheat','Agriculture',556.50,0.25,5000],
['ZS','Soybeans','Agriculture',1024.75,0.25,5000],
['KC','Coffee','Agriculture',318.40,0.05,37500],
['ZB','30-Year T-Bond','Rates',118.84,0.03125,1000],
['ZN','10-Year T-Note','Rates',110.42,0.015625,1000],
['VX','VIX Futures','Volatility',17.80,0.05,1000]
];

// FX: pair, name, rate, pip
const FX = [
['EURUSD','Euro / US Dollar',1.0842,0.0001],
['GBPUSD','British Pound / US Dollar',1.2968,0.0001],
['USDJPY','US Dollar / Japanese Yen',152.48,0.01],
['USDCHF','US Dollar / Swiss Franc',0.8842,0.0001],
['AUDUSD','Australian Dollar / US Dollar',0.6524,0.0001],
['USDCAD','US Dollar / Canadian Dollar',1.3948,0.0001],
['NZDUSD','New Zealand Dollar / US Dollar',0.5886,0.0001],
['USDCNH','US Dollar / Offshore Yuan',7.2468,0.0001],
['USDMXN','US Dollar / Mexican Peso',20.284,0.001],
['USDINR','US Dollar / Indian Rupee',84.42,0.01],
['USDBRL','US Dollar / Brazilian Real',5.842,0.001],
['DXY','US Dollar Index',106.42,0.01]
];

// Crypto: symbol, name, price, circulating supply (millions), max supply or 0
const CRYPTO = [
['BTC','Bitcoin',96480,19.82,21],
['ETH','Ethereum',3428,120.4,0],
['SOL','Solana',218.40,478,0],
['BNB','BNB',682.40,144.6,0],
['XRP','XRP',2.284,57200,100000],
['ADA','Cardano',0.942,35600,45000],
['DOGE','Dogecoin',0.3842,146800,0],
['AVAX','Avalanche',38.42,412,720],
['LINK','Chainlink',22.84,626,1000],
['DOT','Polkadot',7.24,1520,0],
['MATIC','Polygon',0.524,10200,10000],
['LTC','Litecoin',104.20,75.4,84],
['UNI','Uniswap',13.42,601,1000],
['ATOM','Cosmos',6.82,391,0]
];

// Indices: symbol, name, level, what it is
const INDICES = [
['SPX','S&P 500',6118.40,'500 US large caps — the market'],
['NDX','Nasdaq-100',21780.40,'Nasdaq large caps, no financials'],
['DJI','Dow Jones Industrial Average',44218.60,'30 blue chips, price-weighted'],
['RUT','Russell 2000',2312.80,'US small caps — the domestic economy'],
['VIX','CBOE Volatility Index',16.84,'30-day implied vol on the S&P 500'],
['TNX','US 10-Year Yield',4.28,'The discount rate everything hangs off'],
['DXY','US Dollar Index',106.42,'Dollar against a basket of six'],
['N225','Nikkei 225',38420,'Japan large caps'],
['FTSE','FTSE 100',8284,'UK large caps, heavily overseas earnings'],
['DAX','DAX 40',19840,'German large caps'],
['HSI','Hang Seng',20148,'Hong Kong listed, China exposure'],
['SX5E','Euro Stoxx 50',4918,'Eurozone blue chips']
];

// ------------------------------------------------------------------ sector profiles
// Median fundamentals per sector, used as the centre of the distribution a
// ticker's own numbers are drawn from. Keeps a utility from being handed a
// software company's margins.
const SECTOR = {
  'Technology':            { pe: 32, pb: 9.2, gm: 58, om: 26, nm: 21, rev: 14, roe: 28, de: 0.52, cr: 1.9, fcfm: 22, capex: 5.5, cyc: .55 },
  'Communication':         { pe: 24, pb: 4.4, gm: 52, om: 24, nm: 18, rev: 10, roe: 22, de: 0.58, cr: 1.6, fcfm: 19, capex: 9.0, cyc: .50 },
  'Consumer Discretionary':{ pe: 26, pb: 6.2, gm: 38, om: 11, nm: 7.5, rev: 9, roe: 24, de: 1.12, cr: 1.2, fcfm: 8, capex: 5.0, cyc: .85 },
  'Consumer Staples':      { pe: 21, pb: 5.4, gm: 36, om: 15, nm: 10, rev: 4, roe: 26, de: 1.04, cr: 1.0, fcfm: 11, capex: 3.6, cyc: .25 },
  'Healthcare':            { pe: 23, pb: 4.8, gm: 62, om: 22, nm: 16, rev: 8, roe: 21, de: 0.66, cr: 1.5, fcfm: 18, capex: 4.4, cyc: .30 },
  'Financials':            { pe: 14, pb: 1.9, gm: 0,  om: 34, nm: 25, rev: 7, roe: 14, de: 1.84, cr: 0,   fcfm: 0,  capex: 1.2, cyc: .80 },
  'Energy':                { pe: 13, pb: 1.8, gm: 32, om: 14, nm: 9,  rev: 3, roe: 15, de: 0.42, cr: 1.3, fcfm: 12, capex: 11,  cyc: 1.00 },
  'Materials':             { pe: 17, pb: 2.4, gm: 26, om: 13, nm: 8,  rev: 4, roe: 13, de: 0.58, cr: 1.8, fcfm: 9,  capex: 8.5, cyc: .95 },
  'Industrials':           { pe: 22, pb: 4.6, gm: 32, om: 14, nm: 10, rev: 6, roe: 20, de: 0.88, cr: 1.4, fcfm: 10, capex: 4.0, cyc: .80 },
  'Utilities':             { pe: 18, pb: 2.0, gm: 42, om: 20, nm: 12, rev: 4, roe: 11, de: 1.62, cr: 0.8, fcfm: -2, capex: 22,  cyc: .20 },
  'Real Estate':           { pe: 36, pb: 2.6, gm: 62, om: 32, nm: 20, rev: 5, roe: 8,  de: 1.48, cr: 1.1, fcfm: 28, capex: 14,  cyc: .70 }
};
U.SECTOR = SECTOR;

// ------------------------------------------------------------------ build
// Fundamentals are drawn once per ticker from its own seeded stream. Running
// this twice gives the same company, which matters: an analyst's verdict has to
// be reproducible or it is worthless.
function fundamentals(sym, sector, px, sharesM, beta, divYield) {
  const r = M.rng('fund:' + sym), g = () => M.gauss(r);
  const P = SECTOR[sector] || SECTOR['Industrials'];
  const shares = sharesM * 1e6, mcap = px * shares;
  const jitter = (base, sd, lo, hi) => M.clamp(base * (1 + g() * sd), lo, hi);

  const grossMargin = sector === 'Financials' ? 0 : jitter(P.gm, .22, 4, 92);
  const opMargin = jitter(P.om, .35, -22, 60);
  const netMargin = M.clamp(opMargin * (0.70 + r() * 0.16), -30, 48);
  const revenue = mcap / M.clamp(jitter(mcap / 1e9 > 500 ? 7.5 : 3.2, .6, .35, 26), .35, 26);
  const netIncome = revenue * netMargin / 100;
  const eps = netIncome / shares;
  const pe = eps > 0 ? px / eps : -1;
  const bookValue = mcap / M.clamp(jitter(P.pb, .45, .35, 38), .35, 38);
  const bvps = bookValue / shares;
  const roe = bookValue > 0 ? netIncome / bookValue * 100 : 0;
  const debt = bookValue * M.clamp(jitter(P.de, .55, .02, 4.2), .02, 4.2);
  const cash = revenue * M.clamp(jitter(.14, .8, .01, 1.4), .01, 1.4);
  const ebit = revenue * opMargin / 100;
  const ebitda = ebit + revenue * M.clamp(jitter(P.capex * .8, .5, .4, 26), .4, 26) / 100;
  const cfo = netIncome * M.clamp(jitter(1.22, .22, .25, 2.6), .25, 2.6);
  const capex = revenue * M.clamp(jitter(P.capex, .55, .2, 34), .2, 34) / 100;
  const fcf = cfo - capex;
  const revGrowth = jitter(P.rev, .95, -28, 92);
  const epsGrowth = revGrowth * M.clamp(1.15 + g() * .5, -1.4, 3.4);
  const assets = bookValue + debt + revenue * .42;
  const invested = bookValue + debt - cash;

  return {
    shares, mcap, revenue, netIncome, eps, pe,
    fpe: eps > 0 ? px / (eps * (1 + epsGrowth / 100)) : -1,
    pb: bvps > 0 ? px / bvps : -1, bvps, bookValue,
    ps: revenue > 0 ? mcap / revenue : -1,
    ev: mcap + debt - cash,
    evEbitda: ebitda > 0 ? (mcap + debt - cash) / ebitda : -1,
    ebit, ebitda, cfo, capex, fcf,
    fcfYield: mcap > 0 ? fcf / mcap * 100 : 0,
    fcfMargin: revenue > 0 ? fcf / revenue * 100 : 0,
    grossMargin, opMargin, netMargin,
    roe, roa: assets > 0 ? netIncome / assets * 100 : 0,
    roic: invested > 0 ? ebit * .79 / invested * 100 : 0,
    debt, cash, netDebt: debt - cash, assets,
    liabilities: assets - bookValue,
    debtEquity: bookValue > 0 ? debt / bookValue : 9.99,
    netDebtEbitda: ebitda > 0 ? (debt - cash) / ebitda : 9.99,
    currentRatio: sector === 'Financials' ? 0 : M.clamp(jitter(P.cr, .35, .25, 5.5), .25, 5.5),
    quickRatio: sector === 'Financials' ? 0 : M.clamp(jitter(P.cr * .72, .35, .15, 4.6), .15, 4.6),
    interestCoverage: debt > 0 ? M.clamp(ebit / (debt * .055), -8, 90) : 90,
    revGrowth, revGrowth3y: revGrowth * (0.72 + r() * 0.5), epsGrowth,
    epsGrowth5y: epsGrowth * (0.62 + r() * 0.55),
    divYield, payout: eps > 0 ? M.clamp(divYield / 100 * px / eps * 100, 0, 220) : 0,
    divStreak: divYield > 0 ? Math.floor(r() * 46) + 1 : 0,
    buybackYield: M.clamp(g() * 1.9 + (mcap > 2e11 ? 1.5 : .4), -9, 7),
    shareChange: -M.clamp(g() * 1.9 + (mcap > 2e11 ? 1.4 : .2), -9, 7),
    insiderOwn: M.clamp(Math.abs(g()) * 7.5, .02, 48),
    instOwn: M.clamp(72 + g() * 16, 12, 99),
    shortFloat: M.clamp(Math.abs(g()) * 3.4 + .6, .2, 34),
    accruals: (netIncome - cfo) / Math.max(1, assets) * 100,
    workingCapital: revenue * M.clamp(jitter(.11, .9, -.25, .62), -.25, .62),
    retainedEarnings: bookValue * M.clamp(jitter(.62, .5, -.9, 1.5), -.9, 1.5),
    beta,
    // Prior-year figures, needed by the F-Score's year-on-year tests.
    py: {
      roa: 0, cr: 0, shares: 0, gm: 0, turnover: 0, leverage: 0,
      netIncome: netIncome / (1 + epsGrowth / 100 || 1), cfo: cfo * (0.84 + r() * .34)
    }
  };
}

function addStock(row) {
  const [sym, name, sector, industry, pxRaw, shares, beta, divYield] = row;
  const px = +pxRaw;
  const f = fundamentals(sym, sector, px, shares, beta, divYield);
  // Fill the prior-year block now that the current year exists.
  f.py.roa = f.roa / (1 + (f.epsGrowth / 100) * .8 || 1);
  f.py.cr = f.currentRatio * (0.94 + M.rng('py' + sym)() * .14);
  f.py.shares = f.shares * (1 - f.shareChange / 100);
  f.py.gm = f.grossMargin - (M.rng('gm' + sym)() - .45) * 2.6;
  f.py.turnover = f.revenue / Math.max(1, f.assets) * (0.95 + M.rng('to' + sym)() * .12);
  f.py.leverage = f.debtEquity * (0.95 + M.rng('lv' + sym)() * .14);
  return mk({ sym, name, type: 'stock', sector, industry, px, ccy: 'USD', exch: 'NASDAQ/NYSE', f });
}

function mk(o) {
  const inst = Object.assign({
    sym: '', name: '', type: 'stock', sector: '', industry: '', px: 0, ccy: 'USD', exch: '',
    prev: 0, open: 0, hi: 0, lo: 0, vol: 0, chg: 0, chgPct: 0, bid: 0, ask: 0, spread: 0,
    src: 'sim', f: null, candles: null, tape: [], book: null
  }, o);
  inst.prev = inst.px;
  inst.open = inst.px;
  inst.hi = inst.px; inst.lo = inst.px;
  U.list.push(inst); U.bySym[inst.sym] = inst;
  (U.sectors[inst.sector] = U.sectors[inst.sector] || []).push(inst);
  (U.types[inst.type] = U.types[inst.type] || []).push(inst);
  return inst;
}

STOCKS.forEach(addStock);
ETFS.forEach(([sym, name, cls, px, er, y, holds]) => mk({ sym, name, type: 'etf', sector: cls, industry: cls, px, exch: 'NYSE Arca', f: { divYield: y, expense: er, holds, mcap: 0, beta: cls.includes('Bond') || cls.includes('Treas') ? .18 : cls === 'Commodity' ? .32 : 1 } }));
BONDS.forEach(([sym, name, mat, yld, cpn]) => mk({ sym, name, type: 'bond', sector: 'Fixed Income', industry: mat < 1 ? 'Bills' : mat <= 10 ? 'Notes' : 'Bonds', px: yld, exch: 'OTC', f: { maturity: mat, yield: yld, coupon: cpn, duration: mat <= 1 ? mat * .98 : (1 - Math.pow(1 + yld / 100, -mat)) / (yld / 100) * 1.0, beta: 0 } }));
FUTURES.forEach(([sym, name, grp, px, tick, size]) => mk({ sym, name, type: 'future', sector: grp, industry: grp, px, exch: 'CME', f: { tick, size, notional: px * size, beta: grp === 'Index' ? 1 : grp === 'Volatility' ? -3.2 : .45 } }));
FX.forEach(([sym, name, px, pip]) => mk({ sym, name, type: 'fx', sector: 'Currencies', industry: 'Spot FX', px, exch: 'Interbank', f: { pip, beta: 0 } }));
CRYPTO.forEach(([sym, name, px, supply, max]) => mk({ sym, name, type: 'crypto', sector: 'Digital Assets', industry: 'Crypto', px, exch: 'Global', ccy: 'USD', f: { supply: supply * 1e6, maxSupply: max * 1e6, mcap: px * supply * 1e6, beta: 2.4, issuance: max ? 0 : 3.2 } }));
INDICES.forEach(([sym, name, px, what]) => mk({ sym, name, type: 'index', sector: 'Indices', industry: 'Benchmark', px, exch: 'Index', f: { what, beta: 1 } }));

// ------------------------------------------------------------------ lookups
U.get = sym => U.bySym[String(sym || '').toUpperCase()];
U.has = sym => !!U.bySym[String(sym || '').toUpperCase()];
U.ofType = t => U.types[t] || [];
U.search = (q, limit = 24) => {
  q = String(q || '').trim().toUpperCase();
  if (!q) return [];
  const out = [];
  for (const i of U.list) {
    const s = i.sym.toUpperCase(), n = i.name.toUpperCase();
    let score = s === q ? 0 : s.startsWith(q) ? 1 : n.startsWith(q) ? 2 : s.includes(q) ? 3 : n.includes(q) ? 4 : i.industry.toUpperCase().includes(q) ? 6 : -1;
    if (score >= 0) out.push([score, i]);
  }
  return out.sort((a, b) => a[0] - b[0] || a[1].sym.localeCompare(b[1].sym)).slice(0, limit).map(x => x[1]);
};
U.sectorList = () => Object.keys(SECTOR);
U.peers = inst => (U.sectors[inst.sector] || []).filter(x => x !== inst && x.type === inst.type);
// Industry peers first, sector peers as backup — a relative multiple is only
// worth anything against the right comparison set.
U.compSet = inst => {
  const ind = (U.sectors[inst.sector] || []).filter(x => x !== inst && x.industry === inst.industry);
  return ind.length >= 3 ? ind : U.peers(inst);
};
U.count = () => U.list.length;
})();
