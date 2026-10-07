// Apex Legends of Motorsport — discipline and car roster.
// Car rows: "Name|year|hp|kg|top km/h|engine|drive|body"; engine/drive/body fall back to the discipline defaults.
// Specs are approximate period figures (race trim) used to drive the physics.
var RX = window.RX || (window.RX = {});

RX.SPORTS = [
{
  id: 'f1', name: 'Formula 1', years: '1950 – 2025', body: 'openwheel', engine: 'V8', drive: 'RWD', surface: 'asphalt',
  desc: 'The pinnacle of single-seaters: from front-engined Alfettas to ground-effect hybrids. Pit stops, tyre wear, DRS.',
  modes: ['quick', 'gp', 'quali', 'timetrial', 'championship', 'elimination'],
  tracks: [
    ['Monterra Autodromo', 'circuit', 'grass', 3101, { fast: 1 }],
    ['Velaine Street Circuit', 'street', 'coast', 4102, {}],
    ['Silverfield Park', 'circuit', 'grass', 5203, { fast: 1 }],
    ['Ardenwald Ring', 'circuit', 'forest', 6304, { hilly: 1 }],
    ['Suzaka Figure-Eight', 'circuit', 'grass', 7405, {}],
    ['Marina Bay Lights', 'street', 'nightcity', 8506, { night: 1 }],
    ['Interlagio', 'circuit', 'city', 9607, { hilly: 1 }],
    ['Sakhir Dunes', 'circuit', 'desert', 1708, { night: 1 }],
    ['Montreal Island', 'circuit', 'coast', 2809, { walls: 1 }],
    ['Alpine Ring', 'circuit', 'mountain', 3910, { hilly: 1 }]
  ],
  cars: `Alfa Romeo 158 Alfetta|1950|350|700|290|I8
Ferrari 375 F1|1951|380|720|300|V12
Mercedes-Benz W196|1954|290|650|300|I8
Maserati 250F|1957|270|630|290|I6
Vanwall VW5|1958|270|600|290|I4
Cooper T51 Climax|1959|240|460|280|I4
Ferrari 156 'Sharknose'|1961|190|470|270|V6
Lotus 25 Climax|1963|195|450|275|V8
BRM P57|1962|190|470|270|V8
Brabham BT19 Repco|1966|300|500|290|V8
Lotus 49 Cosworth|1967|410|500|300|V8
Matra MS80|1969|430|535|305|V8
Lotus 72D|1972|440|540|310|V8
Tyrrell 003|1971|450|550|310|V8
McLaren M23|1974|490|575|315|V8
Ferrari 312T|1975|510|575|320|F12
Tyrrell P34 six-wheeler|1976|490|580|310|V8
Lotus 79|1978|500|580|315|V8
Brabham BT46B 'Fan Car'|1978|520|595|315|V8
Williams FW07B|1980|520|585|315|V8
Ferrari 126C2|1982|600|580|320|V6T
Brabham BT52|1983|850|540|330|I4T
McLaren MP4/2 TAG|1984|750|540|330|V6T
Williams FW11 Honda|1986|1000|540|340|V6T
Lotus 98T Renault|1986|1100|540|340|V6T
McLaren MP4/4 Honda|1988|650|540|335|V6T
Ferrari 640|1989|660|505|330|V12
McLaren MP4/6 Honda|1991|720|505|330|V12
Williams FW14B Renault|1992|780|505|340|V10
Benetton B194 Ford|1994|740|505|335|V8
Ferrari F310|1996|715|595|335|V10
Williams FW18 Renault|1996|750|595|340|V10
McLaren MP4-13 Mercedes|1998|780|600|340|V10
Ferrari F2002|2002|835|600|355|V10
Williams FW26 BMW|2004|920|605|365|V10
Ferrari F2004|2004|900|605|360|V10
Renault R25|2005|900|605|360|V10
Renault R26|2006|750|605|350|V8
Ferrari F2008|2008|760|605|345|V8
Brawn BGP 001|2009|750|605|340|V8
Red Bull RB6|2010|750|620|340|V8
McLaren MP4-26|2011|750|640|340|V8
Red Bull RB9|2013|750|642|340|V8
Mercedes F1 W05 Hybrid|2014|850|691|350|V6H
Mercedes F1 W07 Hybrid|2016|950|702|350|V6H
Ferrari SF70H|2017|950|728|350|V6H
Mercedes F1 W11 EQ Performance|2020|1000|746|355|V6H
Red Bull RB16B|2021|1000|752|355|V6H
Ferrari F1-75|2022|1000|798|350|V6H
Red Bull RB19|2023|1000|798|350|V6H
McLaren MCL38|2024|1000|798|350|V6H
Ferrari SF-24|2024|1000|798|350|V6H
Mercedes F1 W15|2024|1000|798|350|V6H
Aston Martin AMR24|2024|1000|798|350|V6H
Williams FW46|2024|1000|798|350|V6H
Alpine A524|2024|980|798|348|V6H
McLaren MCL39|2025|1000|800|350|V6H
Red Bull RB21|2025|1000|800|350|V6H`
},
{
  id: 'indy', name: 'IndyCar & CART', years: '1911 – 2025', body: 'openwheel', engine: 'V8T', drive: 'RWD', surface: 'asphalt',
  desc: 'American open-wheelers. Superspeedway ovals at 380 km/h, road and street courses, the Brickyard 500.',
  modes: ['quick', 'oval500', 'timetrial', 'championship', 'elimination'],
  tracks: [
    ['Brickyard Speedway', 'oval', 'grass', 1201, { oval: 'rect', bank: 9 }],
    ['Texan Motor Speedway', 'oval', 'desert', 1302, { oval: 'quad', bank: 22 }],
    ['Pocono Tri-Oval', 'oval', 'forest', 1403, { oval: 'tri', bank: 12 }],
    ['Gateway Short Oval', 'oval', 'city', 1504, { oval: 'egg', bank: 10, small: 1 }],
    ['Long Shore Street Race', 'street', 'coast', 1605, {}],
    ['Laguna Seco', 'circuit', 'desert', 1706, { hilly: 1 }],
    ['Road America Woods', 'circuit', 'forest', 1807, { fast: 1 }],
    ['St. Petersburg Harbour', 'street', 'coast', 1908, {}],
    ['Iowa Bullring', 'oval', 'grass', 2009, { oval: 'egg', bank: 14, small: 1 }],
    ['Mid-Ohio Lakes', 'circuit', 'grass', 2110, {}]
  ],
  cars: `Marmon Wasp|1911|110|1100|130|I6|RWD|prewar
Miller 91|1926|155|700|240|I8|RWD|prewar
Kurtis Kraft 500A|1953|360|750|270|I4
Watson Roadster Offenhauser|1956|380|720|275|I4
Lotus 38 Ford|1965|500|570|290|V8
STP-Paxton Turbocar|1967|550|610|300|T|AWD
Eagle Offy|1972|900|680|320|I4T
McLaren M16C|1974|900|680|320|I4T
Penske PC-6|1978|800|700|320|I4T
Chaparral 2K|1980|800|700|330|V8T
March 86C Cosworth|1986|800|700|340|V8T
Lola T88/00|1988|800|700|345|V8T
Penske PC-18 Chevrolet|1989|800|700|350|V8T
Lola T93/00|1993|850|700|360|V8T
Penske PC-23 Mercedes 500I|1994|1000|700|375|V8T
Reynard 95I|1995|850|700|370|V8T
Swift 007.i|1997|850|700|370|V8T
Reynard 2KI Honda|2000|900|703|380|V8T
Lola B2/00 Toyota|2002|900|703|380|V8T
Dallara IR-03 Toyota|2003|670|700|370|V8
Panoz G-Force GF09|2003|670|700|370|V8
Panoz DP01 Champ Car|2007|750|700|360|V8T
Dallara IR-05 Honda|2007|650|700|365|V8
Dallara DW12 Chevrolet|2012|700|700|370|V6T
Dallara DW12 Honda|2014|700|700|370|V6T
Dallara IR-18 Chevrolet|2018|700|730|375|V6T
Dallara IR-18 Honda|2018|700|730|375|V6T
Dallara IR-18 Aeroscreen|2020|700|742|375|V6T
Dallara IR-18 Hybrid Chevrolet|2024|800|775|380|V6H
Dallara IR-18 Hybrid Honda|2024|800|775|380|V6H`
},
{
  id: 'nascar', name: 'NASCAR Stock Cars', years: '1949 – 2025', body: 'stock', engine: 'V8', drive: 'RWD', surface: 'asphalt',
  desc: 'Forty-car packs, banking, bump-drafting and the big one. Superspeedways, short tracks and road courses.',
  modes: ['quick', 'pack', 'timetrial', 'championship', 'elimination'],
  tracks: [
    ['Daytonna Superspeedway', 'oval', 'coast', 2201, { oval: 'tri', bank: 31, big: 1 }],
    ['Talladeen Superspeedway', 'oval', 'forest', 2302, { oval: 'tri', bank: 33, big: 1 }],
    ['Bristow Bullring', 'oval', 'forest', 2403, { oval: 'egg', bank: 28, small: 1 }],
    ['Martinsburg Paperclip', 'oval', 'grass', 2504, { oval: 'paperclip', bank: 12, small: 1 }],
    ['Charlton Motor Speedway', 'oval', 'city', 2605, { oval: 'quad', bank: 24 }],
    ['Darlingham Egg', 'oval', 'grass', 2706, { oval: 'egg', bank: 25 }],
    ['Watkins Glenn', 'circuit', 'forest', 2807, { hilly: 1 }],
    ['Sonora Raceway', 'circuit', 'desert', 2908, { hilly: 1 }],
    ['Chicago Street Course', 'street', 'city', 3009, {}],
    ['Phoenix Mile', 'oval', 'desert', 3110, { oval: 'egg', bank: 11 }]
  ],
  cars: `Hudson Hornet|1951|210|1650|180
Oldsmobile 88|1949|135|1600|160
Chrysler C-300|1955|300|1750|210
Ford Fairlane 500|1957|285|1700|205
Pontiac Catalina|1961|363|1700|230
Ford Galaxie 500|1963|425|1700|245
Plymouth Belvedere Hemi|1964|425|1650|250
Ford Torino Talladega|1969|600|1700|300
Dodge Charger Daytona|1969|600|1700|320
Plymouth Superbird|1970|600|1700|320
Chevrolet Chevelle Laguna S-3|1975|630|1700|305
Oldsmobile Cutlass Supreme|1978|630|1700|305
Buick Regal|1981|630|1600|310
Ford Thunderbird|1987|650|1600|340
Chevrolet Monte Carlo SS Aerocoupe|1987|650|1600|340
Chevrolet Lumina|1990|680|1600|335
Pontiac Grand Prix|1995|700|1590|330
Ford Taurus|1998|720|1590|330
Dodge Intrepid R/T|2001|750|1590|330
Chevrolet Monte Carlo SS|2004|780|1590|330
Chevrolet Impala SS COT|2008|850|1560|320
Ford Fusion Gen-6|2013|850|1500|325
Toyota Camry Gen-6|2013|850|1500|325
Chevrolet SS Gen-6|2013|850|1500|325
Chevrolet Camaro ZL1 Gen-6|2018|750|1500|320
Ford Mustang GT Gen-6|2019|750|1500|320
Chevrolet Camaro ZL1 Next Gen|2022|670|1530|320
Ford Mustang Dark Horse Next Gen|2024|670|1530|320
Toyota Camry XSE Next Gen|2024|670|1530|320
Ford F-150 Truck Series|2022|650|1540|300|V8|RWD|pickup
Chevrolet Silverado Truck Series|2022|650|1540|300|V8|RWD|pickup
Toyota Tundra TRD Pro Truck Series|2022|650|1540|300|V8|RWD|pickup`
},
{
  id: 'endurance', name: 'Le Mans & Endurance', years: '1923 – 2025', body: 'proto', engine: 'V8', drive: 'RWD', surface: 'asphalt',
  desc: 'Prototypes from Bentley Boys to hypercars. 24-hour races compressed: day-to-night cycles, fuel, tyres, pit stops.',
  modes: ['quick', 'endurance', 'timetrial', 'championship', 'multiclass'],
  tracks: [
    ['Circuit de la Sarthe', 'circuit', 'grass', 4201, { fast: 1, long: 1 }],
    ['Spa Ardennes', 'circuit', 'forest', 4302, { hilly: 1, long: 1 }],
    ['Sebrington Airfield', 'circuit', 'grass', 4403, { fast: 1 }],
    ['Daytona Roval', 'circuit', 'coast', 4504, {}],
    ['Fuji Speedway', 'circuit', 'mountain', 4605, {}],
    ['Nordschleife Green Hell', 'circuit', 'forest', 4706, { hilly: 1, long: 1 }],
    ['Bahrain Night Endurance', 'circuit', 'desert', 4807, { night: 1 }],
    ['Monzetta Temple of Speed', 'circuit', 'grass', 4908, { fast: 1 }],
    ['Petit Lemon Road', 'circuit', 'forest', 5009, { hilly: 1 }],
    ['Interlagos Sprint', 'circuit', 'city', 5110, {}]
  ],
  cars: `Bentley Speed Six 'Old Number One'|1929|180|1700|190|I6|RWD|prewar
Bugatti Type 57G Tank|1937|200|1000|220|I8|RWD|prewar
Jaguar C-Type|1952|220|1000|230|I6|RWD|roadster
Jaguar D-Type|1955|280|880|275|I6|RWD|roadster
Mercedes-Benz 300 SLR|1955|300|880|290|I8|RWD|roadster
Aston Martin DBR1|1959|255|800|270|I6|RWD|roadster
Ferrari 250 Testa Rossa|1958|300|800|270|V12|RWD|roadster
Ford GT40 Mk II|1966|485|1200|330|V8
Ford GT40 Mk IV|1967|500|1200|340|V8
Ferrari 330 P4|1967|450|800|320|V12
Porsche 917K|1970|600|800|350|F12
Porsche 917LH|1971|620|800|385|F12
Matra MS670B|1973|450|660|340|V12
Porsche 936|1976|540|750|340|F6
Renault Alpine A442B|1978|500|800|360|V6T
Porsche 956|1982|620|840|360|F6
Porsche 962C|1985|700|850|370|F6
Jaguar XJR-9LM|1988|750|850|390|V12|RWD|groupc
Sauber-Mercedes C9|1989|720|905|400|V8T|RWD|groupc
Mazda 787B|1991|700|830|340|R|RWD|groupc
Peugeot 905 Evo 1B|1992|670|750|350|V10|RWD|groupc
McLaren F1 GTR Longtail|1997|600|915|320|V12|RWD|gt
Toyota TS020 GT-One|1998|600|900|340|V8T
BMW V12 LMR|1999|580|900|340|V12|RWD|lmpopen
Audi R8 LMP900|2000|610|900|335|V8T|RWD|lmpopen
Bentley Speed 8|2003|615|900|340|V8T
Audi R10 TDI|2006|650|925|330|D|RWD|lmpopen
Peugeot 908 HDi FAP|2007|700|930|340|D
Audi R18 e-tron quattro|2012|700|900|330|D|AWD
Toyota TS040 Hybrid|2014|1000|870|340|V8H|AWD
Porsche 919 Hybrid|2015|900|875|340|V4H|AWD
Nissan GT-R LM Nismo|2015|1250|880|330|V6T|FWD
Audi R18 2016|2016|1000|875|330|D|AWD
Toyota TS050 Hybrid|2016|1000|878|340|V6H|AWD
Toyota GR010 Hybrid|2021|680|1040|330|V6H|AWD|hyper
Glickenhaus SCG 007 LMH|2021|680|1030|330|V8T|RWD|hyper
Peugeot 9X8|2023|680|1030|330|V6H|AWD|hyper
Ferrari 499P|2023|680|1030|340|V6H|AWD|hyper
Porsche 963|2023|680|1030|340|V8H|RWD|hyper
Cadillac V-Series.R|2023|680|1030|340|V8H|RWD|hyper
BMW M Hybrid V8|2024|680|1030|340|V8H|RWD|hyper
Lamborghini SC63|2024|680|1030|340|V8H|RWD|hyper
Alpine A424|2024|680|1030|340|V6H|RWD|hyper
Oreca 07 Gibson LMP2|2017|600|930|330|V8|RWD|proto`
},
{
  id: 'gt', name: 'GT Racing', years: '1962 – 2025', body: 'gt', engine: 'V8', drive: 'RWD', surface: 'asphalt',
  desc: 'Production-based supercars: GT1 monsters, GTE, GT3 and Super GT. Close, contact-heavy racing.',
  modes: ['quick', 'sprint', 'timetrial', 'championship', 'elimination'],
  tracks: [
    ['Nürburg GP Track', 'circuit', 'forest', 5201, {}],
    ['Bathurst Mountain', 'circuit', 'mountain', 5302, { hilly: 1 }],
    ['Suzuka East', 'circuit', 'grass', 5403, {}],
    ['Barcelona-Catalunya', 'circuit', 'grass', 5504, {}],
    ['Paul Ricard Blue Lines', 'circuit', 'coast', 5605, { fast: 1 }],
    ['Kyalami Highveld', 'circuit', 'desert', 5706, { hilly: 1 }],
    ['Macau Guia', 'street', 'nightcity', 5807, { night: 1 }],
    ['Brands Hatch Indy', 'circuit', 'forest', 5908, { hilly: 1 }],
    ['Zandvoort Dunes', 'circuit', 'coast', 6009, { hilly: 1 }],
    ['Yas Marina Twilight', 'circuit', 'desert', 6110, { night: 1 }]
  ],
  cars: `Ferrari 250 GTO|1962|300|880|280|V12
Jaguar E-Type Lightweight|1963|340|960|270|I6
Shelby Cobra Daytona Coupe|1964|385|1050|300|V8
AC Shelby Cobra 427|1965|485|1070|290|V8
Porsche 911 Carrera RSR 2.8|1973|300|900|260|F6
BMW 3.0 CSL 'Batmobile'|1973|430|1060|280|I6
Porsche 935/78 'Moby Dick'|1978|845|1030|366|F6
BMW M1 Procar|1979|470|1020|300|I6
McLaren F1 GTR|1995|600|1050|330|V12
Porsche 911 GT1-98|1998|600|950|330|F6
Mercedes-Benz CLK GTR|1997|600|1000|330|V12
Chrysler Viper GTS-R|1998|750|1150|320|V10
Ferrari 550 Maranello GTS|2003|600|1100|320|V12
Saleen S7-R|2001|750|1050|340|V8
Maserati MC12 GT1|2005|630|1150|330|V12
Aston Martin DBR9|2005|600|1100|320|V12
Chevrolet Corvette C6.R|2006|590|1150|320|V8
Ferrari F430 GT2|2008|470|1150|300|V8
Audi R8 LMS|2009|500|1250|295|V10|AWD
Nissan GT-R GT1|2010|600|1250|310|V8
Nissan GT-R Nismo GT500|2014|550|1020|300|I4T
Lexus LC500 GT500|2017|650|1020|300|I4T
Ford GT LM GTE Pro|2016|500|1245|300|V6T
Porsche 911 RSR (991)|2017|510|1245|300|F6
Aston Martin Vantage AMR GTE|2018|500|1245|300|V8T
Chevrolet Corvette C8.R|2020|500|1245|300|V8
Ferrari 488 GT3 Evo|2020|600|1260|290|V8T
Mercedes-AMG GT3 Evo|2020|550|1285|290|V8
Lamborghini Huracán GT3 Evo2|2023|550|1240|290|V10
Audi R8 LMS GT3 Evo II|2022|585|1235|290|V10
McLaren 720S GT3 Evo|2023|550|1250|290|V8T
BMW M4 GT3|2022|590|1300|290|I6
Porsche 911 GT3 R (992)|2023|565|1250|290|F6
Ferrari 296 GT3|2023|600|1250|290|V6T
Ford Mustang GT3|2024|600|1300|290|V8
Corvette Z06 GT3.R|2024|600|1300|290|V8
Aston Martin Vantage GT3 Evo|2024|535|1300|290|V8T
Lexus RC F GT3|2022|550|1300|285|V8
Honda NSX GT3 Evo22|2022|550|1250|285|V6T
Nissan GT-R Nismo GT3|2018|550|1285|285|V6T`
},
{
  id: 'touring', name: 'Touring Cars', years: '1960 – 2025', body: 'sedan', engine: 'I4', drive: 'FWD', surface: 'asphalt',
  desc: 'BTCC, DTM, WTCC, Supercars and Group A. Door-to-door saloons with reversed-grid sprint races.',
  modes: ['quick', 'reversegrid', 'timetrial', 'championship', 'elimination'],
  tracks: [
    ['Brandsmere Indy', 'circuit', 'forest', 6201, { small: 1 }],
    ['Thruxtonbury', 'circuit', 'grass', 6302, { fast: 1 }],
    ['Knockhill Hills', 'circuit', 'mountain', 6403, { hilly: 1, small: 1 }],
    ['Hockenring Motodrom', 'circuit', 'grass', 6504, {}],
    ['Norisring Streets', 'street', 'city', 6605, {}],
    ['Mount Panorama', 'circuit', 'mountain', 6706, { hilly: 1 }],
    ['Adelaide Parklands', 'street', 'city', 6807, {}],
    ['Vila Real Street', 'street', 'mountain', 6908, { hilly: 1 }],
    ['Oulton Woods', 'circuit', 'forest', 7009, { hilly: 1 }],
    ['Snetterton Airfield', 'circuit', 'grass', 7110, { fast: 1 }]
  ],
  cars: `Mini Cooper S|1964|110|650|180|I4|FWD|hatch
Ford Lotus Cortina|1964|150|820|190|I4|RWD
Alfa Romeo Giulia GTA|1965|170|760|220|I4|RWD
Ford Escort Mk1 Twin Cam|1968|180|780|200|I4|RWD
BMW 635CSi Group A|1983|285|1185|255|I6|RWD
Rover Vitesse SD1|1984|300|1185|250|V8|RWD|hatch
Volvo 240 Turbo|1985|300|1200|250|I4T|RWD
Ford Sierra RS500 Cosworth|1987|550|1150|280|I4T|RWD|hatch
BMW M3 E30 Group A|1987|300|960|245|I4|RWD
Holden Commodore VL SS Group A|1988|380|1350|270|V8|RWD
Nissan Skyline GT-R R32 Group A|1990|600|1260|290|I6T|AWD
Mercedes-Benz 190E 2.5-16 Evo II|1992|370|1040|265|I4|RWD
Alfa Romeo 155 V6 TI|1993|490|1060|290|V6|AWD
Volvo 850 Estate BTCC|1994|290|975|240|I5|FWD|wagon
Opel Calibra V6 4x4 DTM|1996|500|1040|300|V6|AWD|coupe
Audi A4 quattro Supertouring|1996|300|1040|245|I4|AWD
Honda Accord BTCC|1998|300|975|245|I4|FWD
Alfa Romeo 156 GTA S2000|2002|280|1100|240|I4|FWD
Holden Commodore VE V8 Supercar|2010|635|1355|295|V8|RWD
Ford Falcon FG X V8 Supercar|2015|635|1395|295|V8|RWD
Chevrolet Cruze WTCC|2012|380|1100|260|I4T|FWD
Citroën C-Elysée WTCC|2014|380|1100|260|I4T|FWD
Volvo S60 Polestar TC1|2017|380|1100|260|I4T|FWD
Audi RS5 DTM|2019|610|1000|300|I4T|RWD|coupe
BMW M4 DTM|2019|610|1000|300|I4T|RWD|coupe
Mercedes-AMG C63 DTM|2018|500|1115|290|V8|RWD|coupe
Honda Civic Type R TCR|2018|340|1265|250|I4T|FWD|hatch
Hyundai i30 N TCR|2018|350|1265|250|I4T|FWD|hatch
Lynk & Co 03 TCR|2019|350|1265|250|I4T|FWD
Audi RS 3 LMS TCR|2021|340|1265|250|I4T|FWD
Ford Focus ST BTCC|2019|350|1240|250|I4T|FWD|hatch
Toyota Corolla GR Sport BTCC|2021|350|1240|250|I4T|FWD|hatch
BMW 330e M Sport BTCC|2022|350|1300|250|I4T|RWD
Ford Mustang GT Supercar Gen3|2023|600|1300|300|V8|RWD|coupe
Chevrolet Camaro ZL1 Supercar Gen3|2023|600|1300|300|V8|RWD|coupe`
},
{
  id: 'rally', name: 'Rally', years: '1960 – 2025', body: 'hatch', engine: 'I4T', drive: 'AWD', surface: 'gravel',
  desc: 'Flat-out against the clock on gravel, snow and tarmac stages with a co-driver calling pace notes. Group B madness included.',
  modes: ['stage', 'rallyevent', 'superspecial', 'timetrial'],
  tracks: [
    ['Ouninpohja Ridge', 'stage', 'forest', 7201, { surface: 'gravel', jumps: 1 }],
    ['Col de Turini', 'stage', 'mountain', 7302, { surface: 'asphalt', night: 1 }],
    ['Värmland Snowfields', 'stage', 'snow', 7403, { surface: 'snow' }],
    ['Acropolis Rocks', 'stage', 'desert', 7504, { surface: 'gravel' }],
    ['Safari Savannah', 'stage', 'savanna', 7605, { surface: 'dirt' }],
    ['Welsh Forest Sweet Lamb', 'stage', 'forest', 7706, { surface: 'mud', rain: 1 }],
    ['Corsica Ten Thousand Turns', 'stage', 'coast', 7807, { surface: 'asphalt' }],
    ['Rally Mexico Guanajuato', 'stage', 'desert', 7908, { surface: 'gravel', hilly: 1 }],
    ['Arctic Lapland', 'stage', 'snow', 8009, { surface: 'snow', night: 1 }],
    ['Super Special Stadium', 'rx', 'city', 8110, { surface: 'mixed' }]
  ],
  cars: `Mini Cooper S Rally|1964|105|650|170|I4|FWD
Saab 96 V4|1966|95|900|160|V4|FWD|sedan
Lancia Fulvia HF|1972|160|820|190|V4|FWD|coupe
Alpine A110 1800|1973|180|720|210|I4|RWD|coupe
Lancia Stratos HF|1974|280|900|230|V6|RWD|coupe
Ford Escort RS1800 Mk2|1979|250|950|200|I4|RWD|sedan
Fiat 131 Abarth|1978|230|980|200|I4|RWD|sedan
Talbot Sunbeam Lotus|1981|250|950|200|I4|RWD
Opel Ascona 400|1982|275|1000|210|I4|RWD|sedan
Audi Quattro A2|1983|360|1100|220|I5T|AWD|coupe
Lancia 037 Rally|1983|325|960|220|I4T|RWD|coupe
Audi Sport Quattro S1 E2|1985|550|1090|240|I5T|AWD|coupe
Peugeot 205 T16 E2|1985|500|910|240|I4T|AWD
Lancia Delta S4|1986|480|890|240|I4T|AWD
Ford RS200|1986|450|1050|240|I4T|AWD|coupe
MG Metro 6R4|1986|410|1000|230|V6|AWD
Toyota Celica Twin-Cam Turbo|1985|370|1100|220|I4T|RWD|coupe
Lancia Delta HF Integrale Evo|1992|295|1200|220|I4T|AWD
Toyota Celica GT-Four ST185|1993|295|1200|220|I4T|AWD|coupe
Ford Escort RS Cosworth|1994|300|1230|220|I4T|AWD|sedan
Subaru Impreza 555|1995|300|1230|220|F4T|AWD|sedan
Mitsubishi Lancer Evolution VI|1999|300|1230|220|I4T|AWD|sedan
Toyota Corolla WRC|1998|300|1230|220|I4T|AWD
Peugeot 206 WRC|2000|300|1230|220|I4T|AWD
Ford Focus RS WRC 01|2001|300|1230|220|I4T|AWD
Subaru Impreza WRC 2003|2003|300|1230|220|F4T|AWD|sedan
Citroën Xsara WRC|2004|315|1230|220|I4T|AWD
Peugeot 307 WRC|2005|300|1230|220|I4T|AWD|coupe
Citroën C4 WRC|2008|315|1230|220|I4T|AWD|coupe
Ford Fiesta RS WRC|2011|300|1200|220|I4T|AWD
Mini John Cooper Works WRC|2011|300|1200|220|I4T|AWD
Citroën DS3 WRC|2012|315|1200|220|I4T|AWD
Volkswagen Polo R WRC|2015|315|1200|220|I4T|AWD
Toyota Yaris WRC|2017|380|1190|230|I4T|AWD
Hyundai i20 Coupe WRC|2019|380|1190|230|I4T|AWD
Citroën C3 WRC|2018|380|1190|230|I4T|AWD
Ford Fiesta WRC|2017|380|1190|230|I4T|AWD
Toyota GR Yaris Rally1|2022|500|1260|240|I4H|AWD
Hyundai i20 N Rally1|2022|500|1260|240|I4H|AWD
Ford Puma Rally1|2022|500|1260|240|I4H|AWD
Škoda Fabia RS Rally2|2023|290|1230|210|I4T|AWD
Citroën C3 Rally2|2021|290|1230|210|I4T|AWD
Toyota GR Yaris Rally2|2024|290|1230|210|I4T|AWD`
},
{
  id: 'rx', name: 'Rallycross', years: '1967 – 2025', body: 'hatch', engine: 'I4T', drive: 'AWD', surface: 'mixed',
  desc: 'Short mixed-surface circuits: tarmac, gravel and a jump. Heats, a final and the mandatory joker lap.',
  modes: ['quick', 'rxevent', 'timetrial', 'elimination'],
  tracks: [
    ['Lydden Hill Bowl', 'rx', 'grass', 8201, { surface: 'mixed' }],
    ['Höljes Magic Jump', 'rx', 'forest', 8302, { surface: 'mixed', jumps: 1 }],
    ['Holjeskog Arena', 'rx', 'forest', 8403, { surface: 'mixed' }],
    ['Lohéac Bretagne', 'rx', 'grass', 8504, { surface: 'mixed' }],
    ['Montalegre Mountain', 'rx', 'mountain', 8605, { surface: 'mixed', hilly: 1 }],
    ['Barcelona RX Loop', 'rx', 'city', 8706, { surface: 'mixed' }],
    ['Riga Bikernieki', 'rx', 'forest', 8807, { surface: 'mixed' }],
    ['Cape Town Waterfront', 'rx', 'coast', 8908, { surface: 'mixed' }],
    ['Silverstone Stadium RX', 'rx', 'grass', 9009, { surface: 'mixed' }],
    ['Trois-Rivières Night', 'rx', 'city', 9110, { surface: 'mixed', night: 1 }]
  ],
  cars: `Volkswagen Beetle RX|1972|180|800|180|F4|RWD|coupe
Mini Cooper RX|1968|130|700|170|I4|FWD
Porsche 911 RX|1974|320|1000|220|F6|RWD|coupe
Ford Escort Mk2 RX|1978|260|900|200|I4|RWD|sedan
Volvo 240 Turbo RX|1986|430|1150|220|I4T|RWD|sedan
Peugeot 205 T16 RX|1988|560|1000|230|I4T|AWD
Lancia Delta S4 RX|1990|600|980|230|I4T|AWD
Ford RS200 E2 RX|1991|650|1050|240|I4T|AWD|coupe
MG Metro 6R4 RX|1990|450|1000|220|V6|AWD
Ford Escort Cosworth RX|1995|600|1100|230|I4T|AWD|sedan
Citroën Xsara T16 RX|2003|550|1200|230|I4T|AWD
Ford Focus RS RX|2016|600|1300|230|I4T|AWD
Peugeot 208 WRX|2017|600|1300|230|I4T|AWD
Volkswagen Polo R Supercar|2017|600|1300|230|I4T|AWD
Audi S1 EKS RX quattro|2017|600|1300|230|I4T|AWD
Citroën DS3 RX Supercar|2014|600|1300|230|I4T|AWD
Subaru WRX STI ARX|2018|600|1300|230|F4T|AWD|sedan
Hyundai i20 RX|2016|600|1300|230|I4T|AWD
Kia Rio RX1e|2022|680|1400|230|E|AWD
Peugeot 208 RX1e|2023|680|1400|230|E|AWD
Volkswagen Polo RX1e|2023|680|1400|230|E|AWD`
},
{
  id: 'drag', name: 'Drag Racing', years: '1950 – 2025', body: 'dragster', engine: 'NITRO', drive: 'RWD', surface: 'asphalt',
  desc: 'Christmas tree, reaction times and 11,000 hp Top Fuel monsters. Quarter-mile, eighth-mile and the 1000 ft nitro distance.',
  modes: ['drag', 'bracket', 'dragladder', 'mile'],
  tracks: [
    ['Pomona Fairplex Strip', 'drag', 'desert', 9201, { len: 402 }],
    ['Indianapolis Raceway Strip', 'drag', 'grass', 9302, { len: 402 }],
    ['Bristol Dragway Valley', 'drag', 'forest', 9403, { len: 402, hilly: 1 }],
    ['Las Vegas Strip Drag', 'drag', 'desert', 9504, { len: 402, night: 1 }],
    ['Santa Pod Raceway', 'drag', 'grass', 9605, { len: 402 }],
    ['Englishtown Raceway', 'drag', 'forest', 9706, { len: 402 }],
    ['Gainesville Gators', 'drag', 'coast', 9807, { len: 402 }],
    ['Eighth-Mile Street Strip', 'drag', 'nightcity', 9908, { len: 201, night: 1 }],
    ['Salt Flats Mile', 'drag', 'salt', 1009, { len: 1609 }],
    ['Bandimere Mountain Strip', 'drag', 'mountain', 1110, { len: 402 }]
  ],
  cars: `Swamp Rat I|1957|450|700|260|V8|RWD|dragster
Greer-Black-Prudhomme Dragster|1962|1000|750|310|NITRO|RWD|dragster
Chi-Town Hustler|1969|1800|950|350|NITRO|RWD|funny
Hawaiian Charger|1969|1800|950|350|NITRO|RWD|funny
Mongoose Plymouth Duster|1972|2000|950|365|NITRO|RWD|funny
Snake Plymouth Barracuda|1971|2000|950|365|NITRO|RWD|funny
Blue Max Mustang|1979|2500|1000|400|NITRO|RWD|funny
Jungle Jim Chevrolet Vega|1975|2200|950|380|NITRO|RWD|funny
Swamp Rat XXX|1986|4000|900|430|NITRO|RWD|dragster
Top Fuel Dragster 2000|2000|8000|1020|520|NITRO|RWD|dragster
Top Fuel Dragster 2024|2024|11000|1050|540|NITRO|RWD|dragster
Dodge Charger SRT Hellcat Funny Car|2024|11000|1050|520|NITRO|RWD|funny
Toyota GR Supra Funny Car|2024|11000|1050|520|NITRO|RWD|funny
Ford Mustang GT Funny Car|2024|11000|1050|520|NITRO|RWD|funny
Chevrolet Camaro SS Funny Car|2024|11000|1050|520|NITRO|RWD|funny
Chevrolet Camaro Pro Stock|2024|1500|1065|340|V8|RWD|prostock
Ford Mustang Pro Stock|2024|1500|1065|340|V8|RWD|prostock
Dodge Dart Pro Stock|2015|1400|1065|335|V8|RWD|prostock
Pro Mod '41 Willys Coupe|2020|3500|1200|400|V8T|RWD|gasser
Pro Mod Chevrolet Corvette|2022|3500|1200|400|V8T|RWD|prostock
Ford Thunderbolt Super Stock|1964|425|1500|210|V8|RWD|prostock
Dodge Hemi Dart LO23|1968|500|1350|230|V8|RWD|prostock
Plymouth Hemi Barracuda BO29|1968|500|1350|230|V8|RWD|prostock
'33 Willys Gasser|1965|700|1100|240|V8|RWD|gasser
Chevrolet COPO Camaro|2024|1000|1600|280|V8|RWD|prostock
Ford Mustang Cobra Jet|2024|1000|1600|280|V8|RWD|prostock
Ford Mustang Cobra Jet 1400|2022|1400|1700|275|E|RWD|prostock
Dodge Challenger Drag Pak|2024|1000|1600|280|V8|RWD|prostock
Tesla Model S Plaid Street|2022|1020|2160|322|E|AWD|sedan`
},
{
  id: 'drift', name: 'Drifting', years: '1980 – 2025', body: 'coupe', engine: 'I6T', drive: 'RWD', surface: 'asphalt',
  desc: 'Judged on angle, speed and line. Touge runs, Formula Drift battles, and score-attack.',
  modes: ['driftattack', 'tandem', 'touge', 'timetrial'],
  tracks: [
    ['Ebisu Minami', 'circuit', 'forest', 1301, { small: 1, hilly: 1 }],
    ['Irwindale Speedway Bowl', 'oval', 'city', 1402, { oval: 'egg', bank: 8, small: 1 }],
    ['Long Shore Drift Street', 'street', 'coast', 1503, {}],
    ['Haruna Touge', 'stage', 'mountain', 1604, { surface: 'asphalt', hilly: 1, night: 1 }],
    ['Akagi Downhill', 'hill', 'mountain', 1705, { surface: 'asphalt', down: 1, night: 1 }],
    ['Meihan Sportsland', 'circuit', 'forest', 1806, { small: 1 }],
    ['Atlanta Road Atlanta', 'circuit', 'forest', 1907, { hilly: 1 }],
    ['Docks Industrial', 'street', 'nightcity', 2008, { night: 1 }],
    ['Tsukuba Drift Course', 'circuit', 'grass', 2109, { small: 1 }],
    ['Desert Skidpan', 'circuit', 'desert', 2210, { small: 1 }]
  ],
  cars: `Toyota AE86 Sprinter Trueno|1985|160|950|200|I4|RWD|hatch
Nissan Silvia S13|1989|300|1150|230|I4T
Nissan 180SX|1991|320|1150|235|I4T|RWD|hatch
Nissan Silvia S14|1995|350|1180|240|I4T
Nissan Silvia S15 Spec-R|1999|400|1200|250|I4T
Mazda RX-7 FC3S|1987|300|1150|240|R
Mazda RX-7 FD3S|1993|450|1150|260|R
Toyota Chaser JZX100|1998|500|1350|260|I6T|RWD|sedan
Toyota Mark II JZX90|1993|480|1350|255|I6T|RWD|sedan
Toyota Supra A80|1993|650|1350|280|I6T
Nissan Skyline R34 GT-T|1999|450|1350|260|I6T
Nissan Laurel C33|1990|350|1300|240|I6T|RWD|sedan
Lexus SC300|1992|500|1400|260|I6T
Nissan Cefiro A31|1990|350|1300|240|I6T|RWD|sedan
BMW M3 E46 Drift|2001|500|1350|260|I6
BMW E36 325i Drift|1994|350|1250|240|I6
Nissan 350Z Drift|2004|600|1300|270|V6T
Mazda MX-5 NA Drift|1990|250|950|210|I4T|RWD|roadsterc
Ford Mustang RTR Spec 5-FD|2022|1000|1300|290|V8
Toyota GR86 Formula Drift|2022|1000|1250|280|I6T
Toyota GR Supra Formula Drift|2021|1000|1300|290|I6T
Nissan 400Z Formula Drift|2023|1000|1300|290|V6T
Subaru BRZ Formula Drift|2018|800|1250|280|F4T
Chevrolet Corvette C6 Formula Drift|2014|850|1350|290|V8
Dodge Viper SRT-10 Drift|2008|800|1450|300|V10
Nissan GT-R R35 RWD Drift|2018|1100|1500|300|V6T
Toyota Corolla GR AE86 Tribute|2023|900|1300|280|I6T|RWD|hatch`
},
{
  id: 'fe', name: 'Formula E', years: '2014 – 2025', body: 'openwheel', engine: 'E', drive: 'RWD', surface: 'asphalt',
  desc: 'Electric street racing. Manage energy, arm Attack Mode through the activation zone and race in city centres.',
  modes: ['quick', 'eprix', 'timetrial', 'championship'],
  tracks: [
    ['Monaco Harbour ePrix', 'street', 'coast', 2301, {}],
    ['Berlin Tempelhof Apron', 'street', 'city', 2402, {}],
    ['Diriyah Night ePrix', 'street', 'desert', 2503, { night: 1 }],
    ['London ExCeL Indoor', 'street', 'nightcity', 2604, { night: 1 }],
    ['Rome EUR District', 'street', 'city', 2705, { hilly: 1 }],
    ['Mexico City Autódromo', 'circuit', 'city', 2806, {}],
    ['Jakarta Ancol', 'street', 'coast', 2907, {}],
    ['São Paulo Anhembi', 'street', 'city', 3008, {}],
    ['Tokyo Big Sight', 'street', 'nightcity', 3109, { night: 1 }],
    ['Portland Raceway', 'circuit', 'grass', 3210, {}]
  ],
  cars: `Spark-Renault SRT_01E|2014|270|880|225|E
Renault Z.E.15|2015|270|880|225|E
Audi e-tron FE04|2017|270|880|225|E
Spark SRT05e Gen2|2018|335|900|280|E
DS E-Tense FE19|2019|335|900|280|E
Audi e-tron FE07|2021|335|900|280|E
Mercedes-EQ Silver Arrow 02|2021|335|900|280|E
Porsche 99X Electric Gen2|2022|335|900|280|E
Jaguar I-Type 5|2022|335|900|280|E
Spark Gen3 Jaguar I-Type 6|2023|470|850|322|E
Porsche 99X Electric Gen3|2023|470|850|322|E
Nissan e-4ORCE 04|2023|470|850|322|E
Maserati Tipo Folgore|2023|470|850|322|E
McLaren Gen3 NEOM|2023|470|850|322|E
Mahindra M9Electro|2023|470|850|322|E
DS E-Tense FE23|2023|470|850|322|E
Jaguar I-Type 7 Gen3 Evo|2025|480|860|322|E|AWD
Porsche 99X Electric Gen3 Evo|2025|480|860|322|E|AWD`
},
{
  id: 'kart', name: 'Karting', years: '1956 – 2025', body: 'kart', engine: '2T', drive: 'RWD', surface: 'asphalt',
  desc: 'Where every champion starts. Tight indoor and outdoor tracks, rental karts to 250cc superkarts.',
  modes: ['quick', 'kartgp', 'timetrial', 'elimination'],
  tracks: [
    ['PF International', 'kart', 'grass', 3301, {}],
    ['Lonato South Garda', 'kart', 'coast', 3402, {}],
    ['Genk Horensbergdam', 'kart', 'forest', 3503, {}],
    ['Suzuka Kart Land', 'kart', 'grass', 3604, {}],
    ['Indoor Warehouse', 'kart', 'nightcity', 3705, { night: 1 }],
    ['Kartódromo Interlagos', 'kart', 'city', 3806, {}],
    ['Le Mans Alain Prost', 'kart', 'grass', 3907, {}],
    ['Desert Springs Kart', 'kart', 'desert', 4008, {}],
    ['Rooftop Garage Kart', 'kart', 'city', 4109, {}],
    ['Superkart Donington', 'circuit', 'grass', 4210, { small: 1 }]
  ],
  cars: `Kurtis Go-Kart|1956|3|75|60|2T
McCulloch MC-10 Kart|1960|8|80|90|2T
100cc Direct Drive|1975|20|135|110|2T
Rental 4-Stroke (Honda GX390)|2010|13|160|70|4T
Cadet 60cc Comer|2015|8|110|80|2T
Rotax Max Junior|2015|23|145|110|2T
Rotax Max Senior|2018|30|165|120|2T
IAME X30 Senior|2020|30|158|125|2T
OK Senior Direct Drive|2022|42|145|130|2T
KZ2 Shifter (Tony Kart)|2023|48|175|145|2T
KZ1 Shifter (Birel ART)|2023|50|170|150|2T
CRG Road Rebel KZ|2023|48|175|145|2T
Sodi Sigma Endurance|2020|15|170|85|4T
Electric eKart E-Series|2023|30|180|120|E
Superkart 250cc Division 1|2022|90|200|250|2T`
},
{
  id: 'offroad', name: 'Dakar & Trophy Trucks', years: '1969 – 2025', body: 'suv', engine: 'V8', drive: 'AWD', surface: 'sand',
  desc: 'Rally-raids and Baja desert racing. Huge suspension travel, dunes, checkpoints and wide-open terrain.',
  modes: ['raid', 'baja', 'checkpoint', 'timetrial'],
  tracks: [
    ['Empty Quarter Dunes', 'stage', 'desert', 4301, { surface: 'sand', dunes: 1 }],
    ['Baja 1000 Ensenada', 'stage', 'desert', 4402, { surface: 'dirt', jumps: 1 }],
    ['Atacama Salt Pans', 'stage', 'salt', 4503, { surface: 'dirt' }],
    ['Sahara Ténéré', 'stage', 'desert', 4604, { surface: 'sand', dunes: 1 }],
    ['Mint 400 Nevada', 'stage', 'desert', 4705, { surface: 'dirt', jumps: 1 }],
    ['Uyuni Altiplano', 'stage', 'salt', 4806, { surface: 'dirt', hilly: 1 }],
    ['Mongolian Steppe', 'stage', 'savanna', 4907, { surface: 'dirt' }],
    ['Moroccan Atlas Wadi', 'stage', 'mountain', 5008, { surface: 'gravel', hilly: 1 }],
    ['Silk Way Taiga', 'stage', 'forest', 5109, { surface: 'mud', rain: 1 }],
    ['Lake Elsinore Short Course', 'rx', 'desert', 5210, { surface: 'dirt', jumps: 1 }]
  ],
  cars: `Ford Bronco 'Big Oly'|1971|500|1600|190|V8|AWD|suv
Range Rover Paris-Dakar|1981|200|1700|170|V8|AWD|suv
Mercedes-Benz 280 GE Dakar|1983|200|1900|165|I6|AWD|suv
Porsche 959 Paris-Dakar|1986|400|1400|210|F6T|AWD|coupe
Peugeot 205 T16 Grand Raid|1987|360|1250|200|I4T|AWD
Peugeot 405 T16 Grand Raid|1989|400|1300|210|I4T|AWD|sedan
Citroën ZX Rallye Raid|1994|300|1450|190|I4T|AWD
Mitsubishi Pajero Evolution|2003|270|1700|190|V6|AWD|suv
Volkswagen Race Touareg 3|2011|310|1800|190|D|AWD|suv
Mini All4 Racing|2012|315|1900|180|D|AWD|suv
Peugeot 3008 DKR Maxi|2018|340|1600|190|V6T|RWD|buggy
Toyota Hilux Overdrive|2019|380|1850|180|V8|AWD|pickup
Mini John Cooper Works Buggy|2020|340|1600|180|D|RWD|buggy
Audi RS Q e-tron|2022|390|2100|170|E|AWD|buggy
Toyota GR DKR Hilux T1+|2023|400|2000|180|V6T|AWD|pickup
Dacia Sandrider|2025|360|2000|180|V6T|AWD|buggy
Ford Raptor T1+|2025|400|2000|180|V8|AWD|pickup
Can-Am Maverick X3 SSV|2023|200|750|140|I3T|AWD|buggy
Kamaz-Master 43509|2020|1000|9000|140|D|AWD|lorry
Tatra Phoenix|2020|1000|8800|140|D|AWD|lorry
Iveco Powerstar Dakar|2023|1000|9000|140|D|AWD|lorry
Ford F-150 Trophy Truck|2020|900|2700|225|V8|RWD|pickup
Chevrolet Silverado Trophy Truck|2020|900|2700|225|V8|RWD|pickup
Toyota Tundra Trophy Truck|2020|900|2700|225|V8|RWD|pickup
Ford Raptor R Trophy Truck|2024|950|2700|225|V8|RWD|pickup
Class 10 Baja Buggy|2018|250|800|180|I4|RWD|buggy
Class 1 Unlimited Buggy|2022|800|1600|210|V8|RWD|buggy`
},
{
  id: 'prewar', name: 'Pre-War Grand Prix', years: '1906 – 1939', body: 'prewar', engine: 'I8', drive: 'RWD', surface: 'asphalt',
  desc: 'Silver Arrows, Bugattis and Bentleys on gravel-edged road courses with no run-off, rock-hard tyres and drum brakes.',
  modes: ['quick', 'grandepreuve', 'timetrial', 'championship'],
  tracks: [
    ['Avus Banking Berlin', 'oval', 'forest', 5301, { oval: 'paperclip', bank: 40, big: 1 }],
    ['Brooklands Outer Circuit', 'oval', 'grass', 5402, { oval: 'egg', bank: 25 }],
    ['Targa Florio Madonie', 'stage', 'mountain', 5503, { surface: 'gravel', hilly: 1 }],
    ['Monaco 1929', 'street', 'coast', 5604, {}],
    ['Donington Park 1938', 'circuit', 'grass', 5705, { hilly: 1 }],
    ['Reims-Gueux Triangle', 'circuit', 'grass', 5806, { fast: 1 }],
    ['Pescara Circuit', 'circuit', 'coast', 5907, { fast: 1, long: 1 }],
    ['Mille Miglia Brescia', 'stage', 'grass', 6008, { surface: 'asphalt' }],
    ['Montlhéry Autodrome', 'oval', 'forest', 6109, { oval: 'egg', bank: 30 }],
    ['Nürburgring Südschleife', 'circuit', 'forest', 6210, { hilly: 1 }]
  ],
  cars: `Renault AK 90CV|1906|90|1000|150|I4
Fiat 130 HP|1907|130|1150|160|I4
Peugeot L76|1912|148|1000|185|I4
Mercedes 18/100 Grand Prix|1914|115|1080|180|I4
Duesenberg 183|1921|115|900|180|I8
Miller 122|1923|120|750|200|I8
Alfa Romeo P2|1924|155|750|225|I8
Bugatti Type 35B|1927|140|750|215|I8
Delage 15 S8|1927|170|750|215|I8
Bentley Blower 4½ Litre|1929|240|1600|200|I4
Mercedes-Benz SSK|1929|250|1350|200|I6
Alfa Romeo 8C 2300 Monza|1931|180|920|215|I8
Alfa Romeo P3 Tipo B|1932|215|700|230|I8
Maserati 8CM|1933|280|785|245|I8
Bugatti Type 59|1934|250|750|250|I8
Mercedes-Benz W25|1934|354|750|280|I8
Auto Union Type A|1934|295|825|280|V16
Alfa Romeo Bimotore|1935|540|1030|320|I8
Auto Union Type C|1936|520|824|340|V16
ERA R4D|1936|250|750|240|I6
Mercedes-Benz W125|1937|646|750|330|I8
Auto Union Type C Streamliner|1937|560|850|380|V16
Mercedes-Benz W154|1938|476|850|320|V12
Auto Union Type D|1938|485|850|320|V12
Alfa Romeo 158 (1938)|1938|195|630|232|I8
Mercedes-Benz W165|1939|254|900|275|V8`
},
{
  id: 'canam', name: 'Can-Am & Sports Racers', years: '1964 – 1987', body: 'canam', engine: 'V8', drive: 'RWD', surface: 'asphalt',
  desc: 'Unlimited Group 7: big-block V8s, turbo flat-12s, fan cars and the wildest wings ever bolted to a car.',
  modes: ['quick', 'sprint', 'timetrial', 'championship'],
  tracks: [
    ['Riverside Raceway', 'circuit', 'desert', 6301, { fast: 1 }],
    ['Road Atlanta Classic', 'circuit', 'forest', 6402, { hilly: 1 }],
    ['Mosport Park', 'circuit', 'forest', 6503, { hilly: 1 }],
    ['Laguna Seca 1969', 'circuit', 'desert', 6604, { hilly: 1 }],
    ['Watkins Glen 1972', 'circuit', 'forest', 6705, {}],
    ['Edmonton Speedway Park', 'circuit', 'grass', 6806, { fast: 1 }],
    ['Elkhart Lake 1970', 'circuit', 'forest', 6907, { fast: 1 }],
    ['Mid-Ohio 1973', 'circuit', 'grass', 7008, {}],
    ['St. Jovite Mont-Tremblant', 'circuit', 'mountain', 7109, { hilly: 1 }],
    ['Bridgehampton Dunes', 'circuit', 'coast', 7210, {}]
  ],
  cars: `Lotus 30|1964|350|800|270|V8
McLaren M1A|1964|400|650|280|V8
Lola T70 Mk3|1967|500|800|300|V8
Chaparral 2E|1966|450|770|300|V8
Chaparral 2G|1968|650|770|320|V8
McLaren M6A|1967|525|620|300|V8
McLaren M8A|1968|620|630|320|V8
McLaren M8B|1969|630|640|330|V8
McLaren M8D 'Batmobile'|1970|670|640|330|V8
McLaren M8F|1971|740|660|340|V8
Chaparral 2J 'Sucker Car'|1970|680|800|320|V8
Porsche 917PA|1969|580|775|320|F12
Porsche 917/10 TC|1972|1000|780|360|F12
Porsche 917/30 TC|1973|1100|800|385|F12
Shadow DN4|1974|800|730|340|V8
Lola T260|1971|700|680|330|V8
Ferrari 512 S Spider|1970|560|800|320|V12
Ferrari 712 Can-Am|1971|680|800|330|V12
Lola T332 Can-Am|1977|550|650|300|V8
March 707|1970|650|700|320|V8
Chevron B19|1971|275|560|260|I4
Lola T530|1980|600|700|320|V8`
},
{
  id: 'hill', name: 'Hill Climb', years: '1916 – 2025', body: 'proto', engine: 'V6T', drive: 'AWD', surface: 'asphalt',
  desc: 'Race to the clouds: one run, one car, one mountain. Pikes Peak, Goodwood and Alpine switchbacks.',
  modes: ['climb', 'climbevent', 'timetrial'],
  tracks: [
    ['Pikes Peak Highway', 'hill', 'mountain', 7301, { surface: 'asphalt', long: 1 }],
    ['Pikes Peak Gravel 1987', 'hill', 'mountain', 7402, { surface: 'gravel', long: 1 }],
    ['Goodwood Hill', 'hill', 'grass', 7503, { surface: 'asphalt', small: 1 }],
    ['Shelsley Walsh', 'hill', 'forest', 7604, { surface: 'asphalt', small: 1 }],
    ['Mont Ventoux', 'hill', 'mountain', 7705, { surface: 'asphalt' }],
    ['Bergrennen Osnabrück', 'hill', 'forest', 7806, { surface: 'asphalt' }],
    ['Trento-Bondone', 'hill', 'mountain', 7907, { surface: 'asphalt', long: 1 }],
    ['Rossfeld Panorama', 'hill', 'snow', 8008, { surface: 'asphalt' }],
    ['Transfăgărășan', 'hill', 'mountain', 8109, { surface: 'asphalt', night: 1 }],
    ['Bathurst Mountain Run', 'hill', 'grass', 8210, { surface: 'asphalt' }]
  ],
  cars: `Lexington Pikes Peak Special|1916|90|1100|140|I6|RWD|prewar
Audi Sport Quattro S1 E2 Pikes Peak|1987|600|1090|230|I5T|AWD|coupe
Peugeot 405 T16 Pikes Peak|1988|600|1150|230|I4T|AWD|sedan
Suzuki Escudo Pikes Peak|1996|985|800|250|V6T|AWD|suv
Toyota Celica Pikes Peak|1994|850|1100|240|I4T|AWD|coupe
Suzuki SX4 Monster Tajima|2011|910|1090|250|V6T|AWD|hatch
Peugeot 208 T16 Pikes Peak|2013|875|875|240|V6T|AWD
Volkswagen I.D. R Pikes Peak|2018|680|1100|240|E|AWD|lmpopen
Norma M20 RD Limited|2015|500|650|240|I4T|RWD|lmpopen
Unlimited Wolf GB08|2021|600|600|250|I4T|RWD|lmpopen
Ford SuperVan 4.2|2023|1400|2000|240|E|AWD|van
Porsche 911 GT2 RS Clubsport|2019|700|1390|280|F6T|RWD|gt
Acura NSX Pikes Peak|2020|600|1500|260|V6T|AWD|gt
Hyundai Ioniq 5 N Pikes Peak|2024|650|2000|250|E|AWD|hatch
Tesla Model S Plaid Pikes Peak|2021|1020|2000|270|E|AWD|sedan
Bentley Continental GT3 Pikes|2019|550|1300|270|V8T|RWD|gt
Simca 1000 Rallye Hill|1975|130|700|180|I4|RWD|sedan
Osella PA2000|2020|500|560|260|I4|RWD|lmpopen`
},
{
  id: 'dirt', name: 'Dirt Oval & Sprint Cars', years: '1950 – 2025', body: 'sprint', engine: 'V8', drive: 'RWD', surface: 'dirt',
  desc: 'Winged sprint cars, midgets and late models sliding sideways on clay bullrings. Heat races and feature A-mains.',
  modes: ['quick', 'heats', 'timetrial', 'elimination'],
  tracks: [
    ['Knoxville Nationals', 'oval', 'grass', 8301, { oval: 'egg', bank: 12, small: 1, surface: 'dirt' }],
    ['Eldora Speedway', 'oval', 'grass', 8402, { oval: 'egg', bank: 24, small: 1, surface: 'dirt' }],
    ['Williams Grove', 'oval', 'forest', 8503, { oval: 'egg', bank: 10, small: 1, surface: 'dirt' }],
    ['Chili Bowl Indoor', 'oval', 'nightcity', 8604, { oval: 'quad', bank: 14, small: 1, surface: 'dirt', night: 1 }],
    ['Volusia Speedway', 'oval', 'coast', 8705, { oval: 'egg', bank: 18, small: 1, surface: 'dirt' }],
    ['Lernerville Clay', 'oval', 'forest', 8806, { oval: 'egg', bank: 14, small: 1, surface: 'dirt' }],
    ['Perris Auto Speedway', 'oval', 'desert', 8907, { oval: 'rect', bank: 10, small: 1, surface: 'dirt' }],
    ['Bristol Dirt Night', 'oval', 'forest', 9008, { oval: 'egg', bank: 19, small: 1, surface: 'dirt', night: 1 }],
    ['Kokomo Bullring', 'oval', 'grass', 9109, { oval: 'egg', bank: 10, small: 1, surface: 'dirt' }],
    ['Ohsweken Speedway', 'oval', 'grass', 9210, { oval: 'quad', bank: 12, small: 1, surface: 'dirt', night: 1 }]
  ],
  cars: `Kurtis Midget Offenhauser|1950|110|450|160|I4|RWD|midget
Kurtis Sprint Car Offy|1958|300|700|200|I4|RWD|midget
Silver Crown Champ Dirt Car|1975|650|680|230|V8
360 Winged Sprint Car|2020|700|630|230|V8
410 Winged Sprint Car (Maxim)|2024|900|635|260|V8
410 Winged Sprint Car (J&J)|2024|900|635|260|V8
Non-Wing USAC Sprint|2023|650|635|230|V8|RWD|midget
USAC Midget (Spike)|2023|375|450|200|I4|RWD|midget
Micro Sprint 600|2022|150|300|150|I4|RWD|sprint
Dirt Late Model (Rocket)|2024|850|1050|230|V8|RWD|latemodel
Dirt Late Model (Longhorn)|2024|850|1050|230|V8|RWD|latemodel
Big-Block Modified|2024|850|1090|230|V8|RWD|modified
UMP Modified|2022|500|1090|200|V8|RWD|modified
IMCA Stock Car|2022|400|1350|180|V8|RWD|latemodel
Legends Car '34 Ford|2020|125|590|180|I4|RWD|legends
Hobby Stock Monte Carlo|2018|350|1500|170|V8|RWD|stock`
},
{
  id: 'land', name: 'Land Speed & Speed Trials', years: '1898 – 1997', body: 'streamliner', engine: 'T', drive: 'RWD', surface: 'salt',
  desc: 'Flying miles on Bonneville salt and Black Rock desert. Streamliners, jet cars and record-breaking legends.',
  modes: ['mile', 'flyingmile', 'drag'],
  tracks: [
    ['Bonneville Long Course', 'drag', 'salt', 9301, { len: 1609 * 3 }],
    ['Black Rock Desert', 'drag', 'desert', 9402, { len: 1609 * 4 }],
    ['Daytona Beach 1935', 'drag', 'coast', 9503, { len: 1609 * 2 }],
    ['Pendine Sands', 'drag', 'coast', 9604, { len: 1609 * 2 }],
    ['Lake Gairdner Salt', 'drag', 'salt', 9705, { len: 1609 * 3 }],
    ['El Mirage Dry Lake', 'drag', 'desert', 9806, { len: 1609 * 2 }],
    ['Hakskeen Pan', 'drag', 'desert', 9907, { len: 1609 * 4 }],
    ['Lake Eyre Salt', 'drag', 'salt', 1007, { len: 1609 * 3 }],
    ['Bonneville Night Session', 'drag', 'salt', 1107, { len: 1609 * 3, night: 1 }],
    ['Utah Short Course', 'drag', 'salt', 1207, { len: 1609 * 2 }]
  ],
  cars: `Jamais Contente (electric)|1899|67|1500|106|E|RWD|streamliner
Stanley Rocket (steam)|1906|120|800|205|T|RWD|streamliner
Blitzen Benz|1911|200|1450|228|I4|RWD|prewar
Sunbeam 1000hp Mystery|1927|1000|3800|328|V12|RWD|streamliner
Golden Arrow|1929|925|3500|372|V12|RWD|streamliner
Blue Bird (Campbell)|1935|2300|5000|484|V12|RWD|streamliner
Thunderbolt (Eyston)|1938|4700|7000|575|V12|RWD|streamliner
Railton Mobil Special|1947|2500|3100|634|V12|AWD|streamliner
Mercedes-Benz T80|1939|3000|2900|600|V12|RWD|streamliner
Goldenrod|1965|2400|2400|660|V8|AWD|streamliner
Spirit of America (jet)|1964|15000|4100|846|T|RWD|streamliner
Bluebird CN7|1964|4500|4000|648|T|AWD|streamliner
Blue Flame (rocket)|1970|35000|2900|1014|T|RWD|streamliner
Thrust2|1983|30000|4000|1019|T|RWD|streamliner
ThrustSSC|1997|110000|10500|1228|T|RWD|streamliner
Speed Demon Streamliner|2013|2500|1600|740|V8T|RWD|streamliner
Bonneville Belly Tanker|1951|250|800|300|V8|RWD|streamliner`
}
];

RX.MODE_INFO = {
  quick: { name: 'Quick Race', desc: 'Grid start against AI on any track. Choose laps and opponents.' },
  gp: { name: 'Grand Prix Weekend', desc: 'Qualifying lap sets your grid slot, then a race with tyre wear, fuel and a mandatory pit stop.' },
  quali: { name: 'Qualifying Shootout', desc: 'Three flying laps. Best lap wins pole against the AI times.' },
  timetrial: { name: 'Time Trial', desc: 'Solo hot laps with a ghost of your best lap.' },
  championship: { name: 'Championship', desc: 'Five-round season with real points tables.' },
  elimination: { name: 'Elimination', desc: 'The last car at the end of every lap is knocked out. Last one standing wins.' },
  oval500: { name: 'Brickyard 500 Sprint', desc: 'Oval race with drafting, high-speed packs and a pit stop for fuel.' },
  pack: { name: 'Superspeedway Pack', desc: '24-car pack race. Drafting matters: tuck in behind and slingshot past.' },
  endurance: { name: 'Endurance 24', desc: 'A 24-hour race compressed: the sun sets and rises, headlights on, fuel and tyres wear, pit stops.' },
  multiclass: { name: 'Multi-class', desc: 'Prototypes mixed with slower GT traffic. Lap the backmarkers cleanly.' },
  sprint: { name: 'Sprint Race', desc: 'Short race, rolling start, full grid.' },
  reversegrid: { name: 'Reverse-Grid Sprint', desc: 'You start from the back. Carve through a full touring-car grid.' },
  stage: { name: 'Rally Stage', desc: 'Solo point-to-point against the clock with pace notes from your co-driver.' },
  rallyevent: { name: 'Rally Event', desc: 'Three stages back-to-back. Total time against the field of rival times.' },
  superspecial: { name: 'Super Special', desc: 'Head-to-head against a rival car on a parallel stadium stage.' },
  rxevent: { name: 'Rallycross Event', desc: 'Heat race, then the final. Take the joker lap once per race.' },
  drag: { name: 'Drag Race', desc: 'Stage, watch the Christmas tree, launch. Reaction time + elapsed time.' },
  bracket: { name: 'Bracket Racing', desc: 'Dial in a time. Closest to your dial-in without breaking out wins.' },
  dragladder: { name: 'Eliminator Ladder', desc: 'Four rounds of knockout drag racing to the final.' },
  mile: { name: 'Standing Mile', desc: 'Top speed from a standing start over the full strip.' },
  flyingmile: { name: 'Flying Mile', desc: 'Build speed, then the average speed through the measured mile is your record.' },
  driftattack: { name: 'Drift Score Attack', desc: 'Score points for angle, speed and combos. Hold drifts to build the multiplier.' },
  tandem: { name: 'Tandem Battle', desc: 'Chase a lead car and stay close while sideways. Proximity bonus.' },
  touge: { name: 'Touge Run', desc: 'Mountain road, point to point, score drifts while racing the clock.' },
  eprix: { name: 'E-Prix', desc: 'Limited battery. Lift-and-coast and regen, arm Attack Mode (F) for extra power.' },
  kartgp: { name: 'Kart Grand Prix', desc: 'Pre-final and final with a big pack of karts.' },
  raid: { name: 'Rally-Raid Stage', desc: 'Long off-road stage with waypoints. Navigate, survive the terrain.' },
  baja: { name: 'Baja Race', desc: 'Trophy trucks start at intervals. Pass on the open desert.' },
  checkpoint: { name: 'Checkpoint Rush', desc: 'Hit each checkpoint before the clock runs out to gain time.' },
  grandepreuve: { name: 'Grande Épreuve', desc: 'A long pre-war Grand Prix with fragile machinery and heavy tyre wear.' },
  climb: { name: 'Hill Climb Run', desc: 'One run, start to summit, against the clock.' },
  climbevent: { name: 'Climb Event', desc: 'Two runs; the best counts against rival times.' },
  heats: { name: 'Heat + A-Main', desc: 'A heat race sets the order for the feature A-Main.' }
};

// Parse rows into car objects.
RX.CARS = [];
RX.carById = {};
RX.SPORTS.forEach(function (s) {
  s.carList = [];
  s.cars.split('\n').forEach(function (line, i) {
    line = line.trim(); if (!line) return;
    var p = line.split('|');
    var c = {
      id: s.id + '_' + i,
      sport: s.id,
      name: p[0],
      year: +p[1],
      hp: +p[2],
      kg: +p[3],
      top: +p[4],
      engine: p[5] || s.engine,
      drive: p[6] || s.drive,
      body: p[7] || s.body
    };
    RX.CARS.push(c); s.carList.push(c); RX.carById[c.id] = c;
  });
  s.trackList = s.tracks.map(function (t, i) {
    return { id: s.id + '_t' + i, sport: s.id, name: t[0], style: t[1], theme: t[2], seed: t[3], opts: t[4] || {} };
  });
});
RX.sportById = {};
RX.SPORTS.forEach(function (s) { RX.sportById[s.id] = s; });
