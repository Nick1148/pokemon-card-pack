/**
 * Pokemon Card Data Generator → js/cards.js
 *
 * Usage: node fetch-pokemon-cards.js
 *
 * Card data from pokemontcg.io (web-sourced).
 * Images from images.pokemontcg.io CDN (no API key needed).
 *
 * Sets:
 *   sv8    — Surging Sparks (252 cards)
 *   sv8pt5 — Prismatic Evolutions (180 cards)
 */

const fs = require('fs');
const path = require('path');

// CDN URL pattern
const CDN = 'https://images.pokemontcg.io';
const imgSmall = (set, n) => `${CDN}/${set}/${n}.png`;
const imgLarge = (set, n) => `${CDN}/${set}/${n}_hires.png`;

// ===== Type shorthand → full type =====
const T = { G:'grass', F:'fire', W:'water', L:'lightning', P:'psychic', Fi:'fighting', D:'dark', S:'steel', Dr:'dragon', N:'normal', Tr:'trainer', E:'energy' };

// ===== Compact card data: [number, "name", typeCode, "rarity"] =====
// Types: G=Grass, F=Fire, W=Water, L=Lightning, P=Psychic, Fi=Fighting, D=Dark, S=Steel, Dr=Dragon, N=Normal, Tr=Trainer, E=Energy

const SV8_CARDS = [
  // Main set 1-191
  [1,"Exeggcute","G","C"],[2,"Exeggcute","G","C"],[3,"Exeggutor","G","U"],[4,"Durant ex","S","RR"],
  [5,"Scatterbug","G","C"],[6,"Spewpa","G","U"],[7,"Vivillon","G","U"],[8,"Morelull","G","C"],
  [9,"Shiinotic","G","U"],[10,"Dhelmise","G","U"],[11,"Zarude","G","U"],[12,"Capsakid","F","C"],
  [13,"Rellor","Fi","C"],[14,"Rabsca","Fi","U"],[15,"Wo-Chien","G","R"],[16,"Vulpix","F","C"],
  [17,"Ninetales","F","U"],[18,"Paldean Tauros","F","U"],[19,"Ho-Oh","F","R"],
  [20,"Castform Sunny Form","F","C"],[21,"Victini","F","U"],[22,"Pansear","F","C"],
  [23,"Simisear","F","U"],[24,"Larvesta","F","C"],[25,"Volcarona","F","U"],[26,"Oricorio","F","U"],
  [27,"Sizzlipede","F","C"],[28,"Centiskorch","F","U"],[29,"Fuecoco","F","C"],[30,"Crocalor","F","U"],
  [31,"Skeledirge","F","U"],[32,"Charcadet","F","C"],[33,"Charcadet","F","C"],[34,"Armarouge","F","U"],
  [35,"Ceruledge","F","U"],[36,"Ceruledge ex","F","RR"],[37,"Scovillain ex","F","RR"],
  [38,"Gouging Fire","F","R"],[39,"Paldean Tauros","F","U"],
  [40,"Mantine","W","U"],[41,"Feebas","W","C"],[42,"Milotic ex","W","RR"],[43,"Spheal","W","C"],
  [44,"Sealeo","W","U"],[45,"Walrein","W","U"],[46,"Shellos","W","C"],[47,"Cryogonal","W","U"],
  [48,"Black Kyurem ex","W","RR"],[49,"Bruxish","W","U"],[50,"Quaxly","W","C"],[51,"Quaxwell","W","U"],
  [52,"Quaquaval","W","U"],[53,"Cetoddle","W","C"],[54,"Cetitan","W","U"],[55,"Iron Bundle","W","U"],
  [56,"Chien-Pao","W","U"],
  [57,"Pikachu ex","L","RR"],[58,"Magnemite","S","C"],[59,"Magneton","S","U"],[60,"Magnezone","S","U"],
  [61,"Rotom","L","C"],[62,"Blitzle","L","C"],[63,"Zebstrika","L","U"],[64,"Stunfisk","L","U"],
  [65,"Tapu Koko","L","U"],[66,"Wattrel","L","C"],[67,"Kilowattrel","L","U"],
  [68,"Kilowattrel ex","L","RR"],[69,"Miraidon","L","R"],
  [70,"Togepi","P","C"],[71,"Togetic","P","U"],[72,"Togekiss","P","U"],[73,"Marill","W","C"],
  [74,"Azumarill","W","U"],[75,"Smoochum","P","C"],[76,"Latias ex","P","RR"],[77,"Latios","P","U"],
  [78,"Uxie","P","U"],[79,"Mesprit","P","U"],[80,"Azelf","P","U"],[81,"Sigilyph","P","U"],
  [82,"Yamask","P","C"],[83,"Cofagrigus","P","U"],[84,"Espurr","P","C"],[85,"Meowstic","P","U"],
  [86,"Sylveon ex","P","RR"],[87,"Dedenne","P","U"],[88,"Xerneas","P","U"],[89,"Oricorio","P","U"],
  [90,"Sandygast","P","C"],[91,"Palossand ex","P","RR"],[92,"Tapu Lele","P","U"],
  [93,"Indeedee","P","U"],[94,"Flittle","P","C"],[95,"Espathra","P","U"],[96,"Flutter Mane","P","U"],
  [97,"Gimmighoul","P","C"],
  [98,"Mankey","Fi","C"],[99,"Primeape","Fi","U"],[100,"Annihilape","Fi","U"],
  [101,"Paldean Tauros","Fi","U"],[102,"Phanpy","Fi","C"],[103,"Donphan","Fi","U"],
  [104,"Trapinch","Fi","C"],[105,"Vibrava","Fi","U"],[106,"Flygon ex","Fi","RR"],
  [107,"Gastrodon","W","U"],[108,"Drilbur","Fi","C"],[109,"Excadrill","Fi","U"],
  [110,"Landorus","Fi","U"],[111,"Passimian","Fi","U"],[112,"Clobbopus","Fi","C"],
  [113,"Grapploct","Fi","U"],[114,"Glimmet","Fi","C"],[115,"Glimmora","Fi","U"],
  [116,"Koraidon","Fi","R"],
  [117,"Deino","Dr","C"],[118,"Zweilous","Dr","U"],[119,"Hydreigon ex","Dr","RR"],
  [120,"Shroodle","D","C"],[121,"Grafaiai","D","U"],
  [122,"Alolan Diglett","S","C"],[123,"Alolan Dugtrio","S","U"],[124,"Skarmory","S","U"],
  [125,"Registeel","S","U"],[126,"Bronzor","S","C"],[127,"Bronzong","S","U"],[128,"Klefki","S","U"],
  [129,"Duraludon","S","U"],[130,"Archaludon ex","S","RR"],[131,"Gholdengo","S","U"],
  [132,"Iron Crown","S","U"],[133,"Alolan Exeggutor ex","G","RR"],[134,"Altaria","Dr","U"],
  [135,"Dialga","S","U"],[136,"Palkia","W","U"],[137,"Turtonator","F","U"],
  [138,"Applin","G","C"],[139,"Flapple","G","U"],[140,"Appletun","G","U"],
  [141,"Eternatus","D","U"],[142,"Tatsugiri ex","W","RR"],
  [143,"Eevee","N","C"],[144,"Snorlax","N","U"],[145,"Slakoth","N","C"],[146,"Vigoroth","N","U"],
  [147,"Slaking ex","N","RR"],[148,"Zangoose","N","U"],[149,"Kecleon","N","U"],
  [150,"Bouffalant","N","U"],[151,"Swablu","N","C"],[152,"Rufflet","N","C"],[153,"Braviary","N","U"],
  [154,"Helioptile","N","C"],[155,"Heliolisk","N","U"],[156,"Oranguru","N","U"],
  [157,"Tandemaus","N","C"],[158,"Maushold","N","U"],[159,"Cyclizar ex","N","RR"],
  [160,"Flamigo ex","N","RR"],[161,"Terapagos","N","R"],
  // Trainers & Energy (162-191)
  [162,"Amulet of Hope","Tr","U"],[163,"Babiri Berry","Tr","U"],[164,"Brilliant Blender","Tr","U"],
  [165,"Call Bell","Tr","U"],[166,"Chill Teaser Toy","Tr","U"],[167,"Clemont's Quick Wit","Tr","U"],
  [168,"Colbur Berry","Tr","U"],[169,"Counter Gain","Tr","U"],[170,"Cyrano","Tr","U"],
  [171,"Deduction Kit","Tr","U"],[172,"Dragon Elixir","Tr","U"],[173,"Drasna","Tr","U"],
  [174,"Drayton","Tr","U"],[175,"Dusk Ball","Tr","U"],[176,"Energy Search Pro","Tr","U"],
  [177,"Gravity Mountain","Tr","U"],[178,"Jasmine's Gaze","Tr","U"],[179,"Lisia's Appeal","Tr","U"],
  [180,"Lively Stadium","Tr","U"],[181,"Meddling Memo","Tr","U"],[182,"Megaton Blower","Tr","U"],
  [183,"Miracle Headset","Tr","U"],[184,"Passho Berry","Tr","U"],[185,"Precious Trolley","Tr","U"],
  [186,"Scramble Switch","Tr","U"],[187,"Surfer","Tr","U"],
  [188,"TM: Fluorite","Tr","U"],[189,"Tera Orb","Tr","U"],[190,"Tyme","Tr","U"],
  [191,"Enriching Energy","E","U"],
  // Secret: Illustration Rare (192-214) → AR
  [192,"Exeggcute","G","AR"],[193,"Vivillon","G","AR"],[194,"Shiinotic","G","AR"],
  [195,"Castform Sunny Form","F","AR"],[196,"Larvesta","F","AR"],[197,"Ceruledge","F","AR"],
  [198,"Feebas","W","AR"],[199,"Spheal","W","AR"],[200,"Bruxish","W","AR"],
  [201,"Cetitan","W","AR"],[202,"Stunfisk","L","AR"],[203,"Latios","P","AR"],
  [204,"Mesprit","P","AR"],[205,"Phanpy","Fi","AR"],[206,"Vibrava","Fi","AR"],
  [207,"Clobbopus","Fi","AR"],[208,"Alolan Dugtrio","S","AR"],[209,"Skarmory","S","AR"],
  [210,"Flapple","G","AR"],[211,"Appletun","G","AR"],[212,"Slakoth","N","AR"],
  [213,"Kecleon","N","AR"],[214,"Braviary","N","AR"],
  // Secret: Ultra Rare / Full Art (215-235) → SR
  [215,"Durant ex","S","SR"],[216,"Scovillain ex","F","SR"],[217,"Milotic ex","W","SR"],
  [218,"Black Kyurem ex","W","SR"],[219,"Pikachu ex","L","SR"],[220,"Latias ex","P","SR"],
  [221,"Palossand ex","P","SR"],[222,"Flygon ex","Fi","SR"],[223,"Hydreigon ex","Dr","SR"],
  [224,"Archaludon ex","S","SR"],[225,"Alolan Exeggutor ex","G","SR"],[226,"Tatsugiri ex","W","SR"],
  [227,"Slaking ex","N","SR"],[228,"Cyclizar ex","N","SR"],
  [229,"Clemont's Quick Wit","Tr","SR"],[230,"Cyrano","Tr","SR"],[231,"Drasna","Tr","SR"],
  [232,"Drayton","Tr","SR"],[233,"Jasmine's Gaze","Tr","SR"],[234,"Lisia's Appeal","Tr","SR"],
  [235,"Surfer","Tr","SR"],
  // Secret: Special Illustration Rare (236-246) → SAR
  [236,"Durant ex","S","SAR"],[237,"Milotic ex","W","SAR"],[238,"Pikachu ex","L","SAR"],
  [239,"Latias ex","P","SAR"],[240,"Hydreigon ex","Dr","SAR"],[241,"Archaludon ex","S","SAR"],
  [242,"Alolan Exeggutor ex","G","SAR"],[243,"Clemont's Quick Wit","Tr","SAR"],
  [244,"Drayton","Tr","SAR"],[245,"Jasmine's Gaze","Tr","SAR"],[246,"Lisia's Appeal","Tr","SAR"],
  // Secret: Hyper Rare / Gold (247-252) → MUR
  [247,"Pikachu ex","L","MUR"],[248,"Alolan Exeggutor ex","G","MUR"],
  [249,"Counter Gain","Tr","MUR"],[250,"Gravity Mountain","Tr","MUR"],
  [251,"Night Stretcher","Tr","MUR"],[252,"Jet Energy","E","MUR"],
];

const SV8PT5_CARDS = [
  // Main set 1-92 (Pokemon)
  [1,"Exeggcute","G","C"],[2,"Exeggutor","G","U"],[3,"Pinsir","G","U"],[4,"Budew","G","C"],
  [5,"Leafeon","G","U"],[6,"Leafeon ex","G","RR"],[7,"Cottonee","G","C"],[8,"Whimsicott","G","U"],
  [9,"Applin","G","C"],[10,"Dipplin","G","U"],[11,"Hydrapple ex","G","RR"],
  [12,"Teal Mask Ogerpon ex","G","RR"],
  [13,"Flareon","F","U"],[14,"Flareon ex","F","RR"],[15,"Litleo","F","C"],[16,"Pyroar","F","U"],
  [17,"Hearthflame Mask Ogerpon ex","F","RR"],
  [18,"Slowpoke","W","C"],[19,"Slowking","W","U"],[20,"Goldeen","W","C"],[21,"Seaking","W","U"],
  [22,"Vaporeon","W","U"],[23,"Vaporeon ex","W","RR"],[24,"Suicune","W","R"],
  [25,"Glaceon","W","U"],[26,"Glaceon ex","W","RR"],[27,"Wellspring Mask Ogerpon ex","W","RR"],
  [28,"Pikachu ex","L","RR"],[29,"Jolteon","L","U"],[30,"Jolteon ex","L","RR"],
  [31,"Iron Hands ex","L","RR"],[32,"Iron Thorns ex","L","RR"],
  [33,"Espeon","P","U"],[34,"Espeon ex","P","RR"],[35,"Duskull","P","C"],[36,"Dusclops","P","U"],
  [37,"Dusknoir","P","U"],[38,"Spritzee","P","C"],[39,"Aromatisse","P","U"],
  [40,"Sylveon","P","U"],[41,"Sylveon ex","P","RR"],[42,"Scream Tail","P","U"],
  [43,"Flutter Mane","P","U"],[44,"Munkidori","P","U"],[45,"Fezandipiti","P","U"],
  [46,"Iron Boulder","P","U"],
  [47,"Larvitar","Fi","C"],[48,"Pupitar","Fi","U"],[49,"Groudon","Fi","R"],[50,"Riolu","Fi","C"],
  [51,"Lucario ex","Fi","RR"],[52,"Hippopotas","Fi","C"],[53,"Hippowdon","Fi","U"],
  [54,"Bloodmoon Ursaluna","Fi","R"],[55,"Great Tusk","Fi","U"],
  [56,"Sandy Shocks ex","Fi","RR"],[57,"Okidogi","D","U"],
  [58,"Cornerstone Mask Ogerpon ex","Fi","RR"],
  [59,"Umbreon","D","U"],[60,"Umbreon ex","D","RR"],[61,"Sneasel","D","C"],
  [62,"Houndour","D","C"],[63,"Houndoom","D","U"],[64,"Tyranitar ex","D","RR"],
  [65,"Roaring Moon","D","U"],
  [66,"Bronzor","S","C"],[67,"Bronzong","S","U"],[68,"Heatran","S","U"],
  [69,"Duraludon","S","U"],[70,"Archaludon","S","U"],
  [71,"Dreepy","Dr","C"],[72,"Drakloak","Dr","U"],[73,"Dragapult ex","Dr","RR"],
  [74,"Eevee","N","C"],[75,"Eevee ex","N","RR"],[76,"Snorlax ex","N","RR"],
  [77,"Hoothoot","N","C"],[78,"Noctowl","N","U"],[79,"Dunsparce","N","C"],[80,"Dudunsparce","N","U"],
  [81,"Miltank","N","U"],[82,"Lugia ex","N","RR"],[83,"Buneary","N","C"],[84,"Lopunny","N","U"],
  [85,"Fan Rotom","N","U"],[86,"Regigigas","N","R"],[87,"Shaymin","N","U"],
  [88,"Furfrou","N","U"],[89,"Hawlucha","N","U"],[90,"Noibat","N","C"],[91,"Noivern ex","N","RR"],
  [92,"Terapagos ex","N","RR"],
  // Trainers 93-131
  [93,"Amarys","Tr","U"],[94,"Area Zero Underdepths","Tr","U"],[95,"Binding Mochi","Tr","U"],
  [96,"Black Belt's Training (Kanto)","Tr","U"],[97,"Black Belt's Training (Johto)","Tr","U"],
  [98,"Black Belt's Training (Sinnoh)","Tr","U"],[99,"Black Belt's Training (Kalos)","Tr","U"],
  [100,"Briar","Tr","U"],[101,"Buddy-Buddy Poffin","Tr","U"],[102,"Bug Catching Set","Tr","U"],
  [103,"Carmine","Tr","U"],[104,"Ciphermaniac's Codebreaking","Tr","U"],
  [105,"Crispin","Tr","U"],[106,"Earthen Vessel","Tr","U"],[107,"Explorer's Guidance","Tr","U"],
  [108,"Festival Grounds","Tr","U"],[109,"Friends in Paldea","Tr","U"],
  [110,"Glass Trumpet","Tr","U"],[111,"Haban Berry","Tr","U"],
  [112,"Janine's Secret Art","Tr","U"],[113,"Kieran","Tr","U"],[114,"Lacey","Tr","U"],
  [115,"Larry's Skill","Tr","U"],[116,"Max Rod","Tr","U"],[117,"Maximum Belt","Tr","U"],
  [118,"Ogre's Mask","Tr","U"],[119,"Prime Catcher","Tr","U"],
  [120,"Professor Sada's Vitality","Tr","U"],[121,"Professor Turo's Scenario","Tr","U"],
  [122,"Professor's Research (Oak)","Tr","U"],[123,"Professor's Research (Elm)","Tr","U"],
  [124,"Professor's Research (Rowan)","Tr","U"],[125,"Professor's Research (Sycamore)","Tr","U"],
  [126,"Rescue Board","Tr","U"],[127,"Roto Stick","Tr","U"],
  [128,"Scoop Up Cyclone","Tr","U"],[129,"Sparkling Crystal","Tr","U"],
  [130,"Techno Radar","Tr","U"],[131,"Treasure Tracker","Tr","U"],
  // Secret: Full Art Supporters (132-143) → SR
  [132,"Amarys","Tr","SR"],[133,"Atticus","Tr","SR"],[134,"Brassius","Tr","SR"],
  [135,"Eri","Tr","SR"],[136,"Friends in Paldea","Tr","SR"],[137,"Giacomo","Tr","SR"],
  [138,"Larry's Skill","Tr","SR"],[139,"Mela","Tr","SR"],[140,"Ortega","Tr","SR"],
  [141,"Raifort","Tr","SR"],[142,"Ryme","Tr","SR"],[143,"Penny","Tr","SR"],
  // Secret: Special Illustration Rare (144-169) → SAR
  [144,"Leafeon ex","G","SAR"],[145,"Teal Mask Ogerpon ex","G","SAR"],
  [146,"Flareon ex","F","SAR"],[147,"Hearthflame Mask Ogerpon ex","F","SAR"],
  [148,"Vaporeon ex","W","SAR"],[149,"Glaceon ex","W","SAR"],
  [150,"Wellspring Mask Ogerpon ex","W","SAR"],
  [151,"Jolteon ex","L","SAR"],[152,"Iron Hands ex","L","SAR"],[153,"Iron Thorns ex","L","SAR"],
  [154,"Espeon ex","P","SAR"],[155,"Sylveon ex","P","SAR"],
  [156,"Lucario ex","Fi","SAR"],[157,"Sandy Shocks ex","Fi","SAR"],
  [158,"Cornerstone Mask Ogerpon ex","Fi","SAR"],
  [159,"Umbreon ex","D","SAR"],[160,"Tyranitar ex","D","SAR"],
  [161,"Dragapult ex","Dr","SAR"],[162,"Eevee ex","N","SAR"],
  [163,"Snorlax ex","N","SAR"],[164,"Lugia ex","N","SAR"],
  [165,"Noivern ex","N","SAR"],[166,"Terapagos ex","N","SAR"],
  [167,"Pikachu ex","L","SAR"],[168,"Bloodmoon Ursaluna","Fi","SAR"],
  [169,"Hydrapple ex","G","SAR"],
  // Secret: Hyper Rare / Gold (170-180) → MUR
  [170,"Iron Leaves ex","G","MUR"],[171,"Teal Mask Ogerpon ex","G","MUR"],
  [172,"Walking Wake ex","W","MUR"],[173,"Pikachu ex","L","MUR"],
  [174,"Iron Valiant ex","P","MUR"],[175,"Iron Crown ex","S","MUR"],
  [176,"Pecharunt ex","D","MUR"],[177,"Gholdengo ex","S","MUR"],
  [178,"Raging Bolt ex","Dr","MUR"],[179,"Eevee ex","N","MUR"],
  [180,"Terapagos ex","N","MUR"],
];

// ===== SV3PT5 (Pokemon 151) =====
const SV3PT5_CARDS = [
  // 1-151: Original 151 Kanto Pokemon
  [1,"Bulbasaur","G","C"],[2,"Ivysaur","G","U"],[3,"Venusaur ex","G","RR"],
  [4,"Charmander","F","C"],[5,"Charmeleon","F","U"],[6,"Charizard ex","F","RR"],
  [7,"Squirtle","W","C"],[8,"Wartortle","W","U"],[9,"Blastoise ex","W","RR"],
  [10,"Caterpie","G","C"],[11,"Metapod","G","C"],[12,"Butterfree","G","U"],
  [13,"Weedle","G","C"],[14,"Kakuna","G","C"],[15,"Beedrill","G","U"],
  [16,"Pidgey","N","C"],[17,"Pidgeotto","N","U"],[18,"Pidgeot","N","U"],
  [19,"Rattata","N","C"],[20,"Raticate","N","U"],[21,"Spearow","N","C"],[22,"Fearow","N","U"],
  [23,"Ekans","D","C"],[24,"Arbok","D","U"],
  [25,"Pikachu","L","C"],[26,"Raichu","L","U"],
  [27,"Sandshrew","Fi","C"],[28,"Sandslash","Fi","U"],
  [29,"Nidoran F","P","C"],[30,"Nidorina","P","U"],[31,"Nidoqueen","P","R"],
  [32,"Nidoran M","P","C"],[33,"Nidorino","P","U"],[34,"Nidoking ex","P","RR"],
  [35,"Clefairy","P","C"],[36,"Clefable","P","U"],
  [37,"Vulpix","F","C"],[38,"Ninetales ex","F","RR"],
  [39,"Jigglypuff","N","C"],[40,"Wigglytuff ex","N","RR"],
  [41,"Zubat","D","C"],[42,"Golbat","D","U"],
  [43,"Oddish","G","C"],[44,"Gloom","G","U"],[45,"Vileplume","G","R"],
  [46,"Paras","G","C"],[47,"Parasect","G","U"],
  [48,"Venonat","G","C"],[49,"Venomoth","G","U"],
  [50,"Diglett","Fi","C"],[51,"Dugtrio","Fi","U"],
  [52,"Meowth","N","C"],[53,"Persian","N","U"],
  [54,"Psyduck","W","C"],[55,"Golduck","W","U"],
  [56,"Mankey","Fi","C"],[57,"Primeape","Fi","U"],
  [58,"Growlithe","F","C"],[59,"Arcanine ex","F","RR"],
  [60,"Poliwag","W","C"],[61,"Poliwhirl","W","U"],[62,"Poliwrath","W","R"],
  [63,"Abra","P","C"],[64,"Kadabra","P","U"],[65,"Alakazam ex","P","RR"],
  [66,"Machop","Fi","C"],[67,"Machoke","Fi","U"],[68,"Machamp","Fi","R"],
  [69,"Bellsprout","G","C"],[70,"Weepinbell","G","U"],[71,"Victreebel","G","R"],
  [72,"Tentacool","W","C"],[73,"Tentacruel","W","U"],
  [74,"Geodude","Fi","C"],[75,"Graveler","Fi","U"],[76,"Golem ex","Fi","RR"],
  [77,"Ponyta","F","C"],[78,"Rapidash","F","U"],
  [79,"Slowpoke","P","C"],[80,"Slowbro","P","U"],
  [81,"Magnemite","L","C"],[82,"Magneton","L","U"],
  [83,"Farfetch'd","N","C"],[84,"Doduo","N","C"],[85,"Dodrio","N","U"],
  [86,"Seel","W","C"],[87,"Dewgong","W","U"],
  [88,"Grimer","D","C"],[89,"Muk","D","U"],
  [90,"Shellder","W","C"],[91,"Cloyster","W","U"],
  [92,"Gastly","P","C"],[93,"Haunter","P","U"],[94,"Gengar","P","R"],
  [95,"Onix","Fi","U"],[96,"Drowzee","P","C"],[97,"Hypno","P","U"],
  [98,"Krabby","W","C"],[99,"Kingler","W","U"],
  [100,"Voltorb","L","C"],[101,"Electrode","L","U"],
  [102,"Exeggcute","G","C"],[103,"Exeggutor","G","U"],
  [104,"Cubone","Fi","C"],[105,"Marowak","Fi","U"],
  [106,"Hitmonlee","Fi","U"],[107,"Hitmonchan","Fi","U"],
  [108,"Lickitung","N","U"],[109,"Koffing","D","C"],[110,"Weezing","D","U"],
  [111,"Rhyhorn","Fi","C"],[112,"Rhydon","Fi","U"],
  [113,"Chansey","N","R"],[114,"Tangela","G","U"],[115,"Kangaskhan","N","R"],
  [116,"Horsea","W","C"],[117,"Seadra","W","U"],
  [118,"Goldeen","W","C"],[119,"Seaking","W","U"],
  [120,"Staryu","W","C"],[121,"Starmie","W","U"],
  [122,"Mr. Mime","P","R"],[123,"Scyther","G","R"],[124,"Jynx","P","U"],
  [125,"Electabuzz","L","U"],[126,"Magmar","F","U"],[127,"Pinsir","G","U"],
  [128,"Tauros","N","U"],[129,"Magikarp","W","C"],[130,"Gyarados","W","R"],
  [131,"Lapras","W","R"],[132,"Ditto","N","U"],
  [133,"Eevee","N","C"],[134,"Vaporeon","W","U"],[135,"Jolteon","L","U"],[136,"Flareon","F","U"],
  [137,"Porygon","N","U"],[138,"Omanyte","W","C"],[139,"Omastar","W","U"],
  [140,"Kabuto","Fi","C"],[141,"Kabutops","Fi","U"],
  [142,"Aerodactyl","N","R"],[143,"Snorlax","N","R"],
  [144,"Articuno","W","R"],[145,"Zapdos ex","L","RR"],[146,"Moltres","F","R"],
  [147,"Dratini","Dr","C"],[148,"Dragonair","Dr","U"],[149,"Dragonite","Dr","R"],
  [150,"Mewtwo ex","P","RR"],[151,"Mew ex","P","RR"],
  // Trainers 152-165
  [152,"Erika's Invitation","Tr","U"],[153,"Giovanni's Charisma","Tr","U"],
  [154,"Bill's Transfer","Tr","U"],[155,"Daisy's Help","Tr","U"],
  [156,"Cycling Road","Tr","U"],[157,"Leftovers","Tr","U"],
  [158,"Poke Ball","Tr","U"],[159,"Potion","Tr","U"],
  [160,"Professor's Research","Tr","U"],[161,"Sabrina's ESP","Tr","U"],
  [162,"Super Potion","Tr","U"],[163,"Switch","Tr","U"],
  [164,"Town Map","Tr","U"],[165,"Basic Fire Energy","E","U"],
  // AR (Art Rare) 166-181
  [166,"Bulbasaur","G","AR"],[167,"Charmander","F","AR"],[168,"Squirtle","W","AR"],
  [169,"Pikachu","L","AR"],[170,"Nidoking","P","AR"],[171,"Ninetales","F","AR"],
  [172,"Alakazam","P","AR"],[173,"Machamp","Fi","AR"],[174,"Gengar","P","AR"],
  [175,"Gyarados","W","AR"],[176,"Eevee","N","AR"],[177,"Dragonite","Dr","AR"],
  [178,"Mewtwo","P","AR"],[179,"Mew","P","AR"],[180,"Snorlax","N","AR"],[181,"Articuno","W","AR"],
  // SR (Super Rare) 182-197
  [182,"Venusaur ex","G","SR"],[183,"Charizard ex","F","SR"],[184,"Blastoise ex","W","SR"],
  [185,"Nidoking ex","P","SR"],[186,"Ninetales ex","F","SR"],[187,"Wigglytuff ex","N","SR"],
  [188,"Arcanine ex","F","SR"],[189,"Alakazam ex","P","SR"],[190,"Golem ex","Fi","SR"],
  [191,"Zapdos ex","L","SR"],[192,"Mewtwo ex","P","SR"],[193,"Mew ex","P","SR"],
  [194,"Erika's Invitation","Tr","SR"],[195,"Giovanni's Charisma","Tr","SR"],
  [196,"Bill's Transfer","Tr","SR"],[197,"Sabrina's ESP","Tr","SR"],
  // SAR (Special Art Rare) 198-205
  [198,"Venusaur ex","G","SAR"],[199,"Charizard ex","F","SAR"],[200,"Blastoise ex","W","SAR"],
  [201,"Alakazam ex","P","SAR"],[202,"Zapdos ex","L","SAR"],[203,"Mewtwo ex","P","SAR"],
  [204,"Mew ex","P","SAR"],[205,"Erika's Invitation","Tr","SAR"],
  // MUR (Hyper Rare) 206-207
  [206,"Mew ex","P","MUR"],[207,"Erika's Invitation","Tr","MUR"],
];

// ===== SV7 (Stellar Crown) =====
const SV7_CARDS = [
  // Main set 1-141
  [1,"Oddish","G","C"],[2,"Gloom","G","U"],[3,"Vileplume","G","U"],
  [4,"Bellsprout","G","C"],[5,"Weepinbell","G","U"],[6,"Victreebel ex","G","RR"],
  [7,"Sunkern","G","C"],[8,"Sunflora","G","U"],[9,"Seedot","G","C"],
  [10,"Nuzleaf","G","U"],[11,"Shiftry","G","U"],[12,"Roselia","G","C"],
  [13,"Roserade","G","U"],[14,"Turtwig","G","C"],[15,"Grotle","G","U"],
  [16,"Torterra","G","U"],[17,"Pansage","G","C"],[18,"Simisage","G","U"],
  [19,"Deerling","G","C"],[20,"Sawsbuck","G","U"],
  [21,"Vulpix","F","C"],[22,"Ninetales","F","U"],[23,"Growlithe","F","C"],
  [24,"Arcanine","F","U"],[25,"Magmar","F","U"],[26,"Magmortar","F","U"],
  [27,"Pansear","F","C"],[28,"Simisear","F","U"],[29,"Litwick","F","C"],
  [30,"Lampent","F","U"],[31,"Chandelure ex","F","RR"],
  [32,"Psyduck","W","C"],[33,"Golduck","W","U"],[34,"Poliwag","W","C"],
  [35,"Poliwhirl","W","U"],[36,"Politoed","W","U"],[37,"Slowpoke","W","C"],
  [38,"Slowking","W","U"],[39,"Qwilfish","W","U"],[40,"Suicune","W","R"],
  [41,"Panpour","W","C"],[42,"Simipour","W","U"],[43,"Tympole","W","C"],
  [44,"Palpitoad","W","U"],[45,"Seismitoad ex","W","RR"],
  [46,"Pikachu","L","C"],[47,"Raichu","L","U"],[48,"Voltorb","L","C"],
  [49,"Electrode","L","U"],[50,"Chinchou","L","C"],[51,"Lanturn","L","U"],
  [52,"Mareep","L","C"],[53,"Flaaffy","L","U"],[54,"Ampharos","L","U"],
  [55,"Helioptile","L","C"],[56,"Heliolisk","L","U"],[57,"Tapu Koko ex","L","RR"],
  [58,"Clefairy","P","C"],[59,"Clefable","P","U"],[60,"Jynx","P","U"],
  [61,"Natu","P","C"],[62,"Xatu","P","U"],[63,"Ralts","P","C"],
  [64,"Kirlia","P","U"],[65,"Gardevoir","P","R"],[66,"Gallade","P","R"],
  [67,"Meloetta","P","U"],[68,"Hatenna","P","C"],[69,"Hattrem","P","U"],
  [70,"Hatterene ex","P","RR"],
  [71,"Machop","Fi","C"],[72,"Machoke","Fi","U"],[73,"Machamp","Fi","U"],
  [74,"Cubone","Fi","C"],[75,"Marowak","Fi","U"],[76,"Hitmontop","Fi","U"],
  [77,"Riolu","Fi","C"],[78,"Lucario","Fi","R"],[79,"Landorus","Fi","R"],
  [80,"Mudbray","Fi","C"],[81,"Mudsdale","Fi","U"],
  [82,"Murkrow","D","C"],[83,"Honchkrow","D","U"],[84,"Houndour","D","C"],
  [85,"Houndoom","D","U"],[86,"Absol","D","R"],[87,"Purrloin","D","C"],
  [88,"Liepard","D","U"],[89,"Inkay","D","C"],[90,"Malamar","D","U"],
  [91,"Bronzor","S","C"],[92,"Bronzong","S","U"],[93,"Klang","S","U"],
  [94,"Klinklang","S","U"],[95,"Registeel","S","R"],[96,"Terapagos","N","R"],
  [97,"Terapagos ex","N","RR"],[98,"Dunsparce","N","C"],[99,"Girafarig","N","U"],
  [100,"Farigiraf ex","N","RR"],[101,"Zangoose","N","U"],[102,"Seviper","D","U"],
  [103,"Kecleon","N","C"],[104,"Castform","N","C"],[105,"Starly","N","C"],
  [106,"Staravia","N","U"],[107,"Staraptor","N","U"],[108,"Bidoof","N","C"],
  [109,"Bibarel","N","U"],[110,"Chatot","N","U"],
  // Trainers 111-140
  [111,"Amarys","Tr","U"],[112,"Arven","Tr","U"],[113,"Boss's Orders","Tr","U"],
  [114,"Buddy-Buddy Poffin","Tr","U"],[115,"Ciphermaniac's Codebreaking","Tr","U"],
  [116,"Colress's Tenacity","Tr","U"],[117,"Crispin","Tr","U"],
  [118,"Earthen Vessel","Tr","U"],[119,"Energy Switch","Tr","U"],
  [120,"Explorer's Guidance","Tr","U"],[121,"Heavy Ball","Tr","U"],
  [122,"Iono","Tr","U"],[123,"Judge","Tr","U"],
  [124,"Lacey","Tr","U"],[125,"Night Stretcher","Tr","U"],
  [126,"Pal Pad","Tr","U"],[127,"Penny","Tr","U"],
  [128,"Pokemon Catcher","Tr","U"],[129,"Professor's Research","Tr","U"],
  [130,"Rare Candy","Tr","U"],[131,"Rescue Board","Tr","U"],
  [132,"Rigid Band","Tr","U"],[133,"Sparkling Crystal","Tr","U"],
  [134,"Super Rod","Tr","U"],[135,"Switch","Tr","U"],
  [136,"Technical Machine: Devolution","Tr","U"],
  [137,"Ultra Ball","Tr","U"],[138,"Unfair Stamp","Tr","U"],
  [139,"Vitality Band","Tr","U"],[140,"Luminous Energy","E","U"],
  [141,"Legacy Energy","E","U"],
  // AR 142-155
  [142,"Oddish","G","AR"],[143,"Victreebel","G","AR"],[144,"Chandelure","F","AR"],
  [145,"Golduck","W","AR"],[146,"Slowking","W","AR"],[147,"Pikachu","L","AR"],
  [148,"Raichu","L","AR"],[149,"Clefable","P","AR"],[150,"Gardevoir","P","AR"],
  [151,"Machamp","Fi","AR"],[152,"Lucario","Fi","AR"],[153,"Absol","D","AR"],
  [154,"Terapagos","N","AR"],[155,"Bidoof","N","AR"],
  // SR 156-167
  [156,"Victreebel ex","G","SR"],[157,"Chandelure ex","F","SR"],
  [158,"Seismitoad ex","W","SR"],[159,"Tapu Koko ex","L","SR"],
  [160,"Hatterene ex","P","SR"],[161,"Terapagos ex","N","SR"],
  [162,"Farigiraf ex","N","SR"],[163,"Iono","Tr","SR"],
  [164,"Lacey","Tr","SR"],[165,"Penny","Tr","SR"],
  [166,"Colress's Tenacity","Tr","SR"],[167,"Crispin","Tr","SR"],
  // SAR 168-173
  [168,"Chandelure ex","F","SAR"],[169,"Tapu Koko ex","L","SAR"],
  [170,"Hatterene ex","P","SAR"],[171,"Terapagos ex","N","SAR"],
  [172,"Iono","Tr","SAR"],[173,"Lacey","Tr","SAR"],
  // MUR 174-175
  [174,"Terapagos ex","N","MUR"],[175,"Sparkling Crystal","Tr","MUR"],
];

// ===== Set configurations =====
const SETS = [
  {
    cdnId: 'sv3pt5',
    ourId: 'sv3pt5',
    name: 'Pokemon 151',
    nameKo: '포켓몬 카드 151',
    fullName: 'Scarlet & Violet — 151',
    baseCards: 165,
    totalCards: 207,
    releaseDate: '2023-09-22',
    cardsPerPack: 10,
    price: 2000,
    coverColor: 'linear-gradient(135deg, #ef4444, #f97316, #eab308)',
    packImage: 'assets/sv3pt5_pack.png',
    cards: SV3PT5_CARDS,
  },
  {
    cdnId: 'sv7',
    ourId: 'sv7',
    name: 'Stellar Crown',
    nameKo: '스텔라크라운',
    fullName: 'Scarlet & Violet — Stellar Crown',
    baseCards: 141,
    totalCards: 175,
    releaseDate: '2024-09-13',
    cardsPerPack: 10,
    price: 1500,
    coverColor: 'linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899)',
    packImage: 'assets/sv7_pack.png',
    cards: SV7_CARDS,
  },
  {
    cdnId: 'sv8',
    ourId: 'sv8',
    name: 'Surging Sparks',
    nameKo: '초전브레이커',
    fullName: 'Scarlet & Violet — Surging Sparks',
    baseCards: 191,
    totalCards: 252,
    releaseDate: '2024-11-08',
    cardsPerPack: 10,
    price: 1500,
    coverColor: 'linear-gradient(135deg, #ff6b00, #ffcc00)',
    packImage: 'assets/sv8_pack_kr.png',
    cards: SV8_CARDS,
  },
  {
    cdnId: 'sv8pt5',
    ourId: 'sv8pt5',
    name: 'Prismatic Evolutions',
    nameKo: '프리즈매틱 에볼루션',
    fullName: 'Scarlet & Violet — Prismatic Evolutions',
    baseCards: 131,
    totalCards: 180,
    releaseDate: '2025-01-17',
    cardsPerPack: 10,
    price: 1500,
    coverColor: 'linear-gradient(135deg, #a855f7, #ec4899, #f59e0b)',
    packImage: 'assets/sv8pt5_pack.jpg',
    cards: SV8PT5_CARDS,
  },
];

// ===== Generate js/cards.js =====
function generate() {
  const lines = [];

  lines.push(`/**`);
  lines.push(` * Pokemon Card Pack Simulator - Card Data`);
  lines.push(` * Generated: ${new Date().toISOString()}`);
  lines.push(` * Images: images.pokemontcg.io CDN (no API key needed)`);
  lines.push(` */`);
  lines.push('');
  lines.push('const PACK_DATA = {');

  for (const set of SETS) {
    lines.push(`  '${set.ourId}': {`);
    lines.push(`    info: {`);
    lines.push(`      id: '${set.ourId}',`);
    lines.push(`      name: '${set.name}',`);
    lines.push(`      nameKo: '${set.nameKo}',`);
    lines.push(`      fullName: '${set.fullName}',`);
    lines.push(`      totalCards: ${set.totalCards},`);
    lines.push(`      baseCards: ${set.baseCards},`);
    lines.push(`      releaseDate: '${set.releaseDate}',`);
    lines.push(`      cardsPerPack: ${set.cardsPerPack},`);
    lines.push(`      price: ${set.price},`);
    lines.push(`      packImage: '${set.packImage}',`);
    lines.push(`      maxImageId: ${set.totalCards},`);
    lines.push(`      coverColor: '${set.coverColor}'`);
    lines.push(`    },`);
    lines.push(`    cards: [`);

    for (const [num, name, typeCode, rarity] of set.cards) {
      const type = T[typeCode];
      const small = imgSmall(set.cdnId, num);
      const large = imgLarge(set.cdnId, num);
      lines.push(`      { id: ${num}, name: ${JSON.stringify(name)}, type: '${type}', rarity: '${rarity}', imageSmall: '${small}', imageLarge: '${large}' },`);
    }

    lines.push(`    ]`);
    lines.push(`  },`);
  }

  lines.push('};');
  lines.push('');
  lines.push(`let CURRENT_SET_ID = '${SETS[0].ourId}';`);
  lines.push('let CARD_SET = PACK_DATA[CURRENT_SET_ID].info;');
  lines.push('let CARDS = PACK_DATA[CURRENT_SET_ID].cards;');
  lines.push('let MAX_IMAGE_ID = CARD_SET.maxImageId;');
  lines.push('');
  lines.push('function changeSet(setId) {');
  lines.push('  if (PACK_DATA[setId]) {');
  lines.push('    CURRENT_SET_ID = setId;');
  lines.push('    CARD_SET = PACK_DATA[setId].info;');
  lines.push('    CARDS = PACK_DATA[setId].cards;');
  lines.push('    MAX_IMAGE_ID = CARD_SET.maxImageId;');
  lines.push('    return true;');
  lines.push('  }');
  lines.push('  return false;');
  lines.push('}');
  lines.push('');
  lines.push('function getCardImageUrl(cardId, size, setId) {');
  lines.push('  setId = setId || CURRENT_SET_ID;');
  lines.push('  size = size || 400;');
  lines.push('  var setCards = PACK_DATA[setId] && PACK_DATA[setId].cards;');
  lines.push('  if (!setCards) return "/assets/cards/SD1/001.svg";');
  lines.push('  var card = setCards.find(function(c) { return c.id === cardId; });');
  lines.push('  if (card) {');
  lines.push('    if (size >= 600 && card.imageLarge) return card.imageLarge;');
  lines.push('    if (card.imageSmall) return card.imageSmall;');
  lines.push('  }');
  lines.push('  return "/assets/cards/SD1/" + String(cardId).padStart(3, "0") + ".svg";');
  lines.push('}');
  lines.push('');
  lines.push("const RARITY_INFO = {");
  lines.push("  'C':   { label: 'C',   fullName: 'Common',            color: '#9e9e9e', bgColor: '#f5f5f5' },");
  lines.push("  'U':   { label: 'U',   fullName: 'Uncommon',          color: '#4caf50', bgColor: '#e8f5e9' },");
  lines.push("  'R':   { label: 'R',   fullName: 'Rare',              color: '#2196f3', bgColor: '#e3f2fd' },");
  lines.push("  'RR':  { label: 'RR',  fullName: 'Double Rare',       color: '#ff9800', bgColor: '#fff3e0' },");
  lines.push("  'AR':  { label: 'AR',  fullName: 'Art Rare',          color: '#e040fb', bgColor: '#fce4ec' },");
  lines.push("  'SR':  { label: 'SR',  fullName: 'Super Rare',        color: '#ffd700', bgColor: '#fffde7' },");
  lines.push("  'SAR': { label: 'SAR', fullName: 'Special Art Rare',  color: '#d500f9', bgColor: '#f3e5f5' },");
  lines.push("  'MUR': { label: 'MUR', fullName: 'Hyper Rare',        color: '#ffd700', bgColor: 'linear-gradient(135deg, #ff6b35, #ffd700, #ff1744)' },");
  lines.push("};");
  lines.push('');
  lines.push("const GACHA_PROBABILITY_DATA = {");
  lines.push("  packSize: 10,");
  lines.push("  slots: {");
  lines.push("    '1~3': { label: 'Slot 1~3', description: 'Basic cards', probabilities: { C: 100 } },");
  lines.push("    '4~5': { label: 'Slot 4~5', description: 'Basic/Uncommon', probabilities: { C: 40, U: 60 } },");
  lines.push("    '6~7': { label: 'Slot 6~7', description: 'Uncommon/Rare', probabilities: { U: 70, R: 30 } },");
  lines.push("    '8':   { label: 'Slot 8',   description: 'Rare+', probabilities: { R: 70, RR: 25, AR: 5 } },");
  lines.push("    '9':   { label: 'Slot 9',   description: 'Rare+ (higher)', probabilities: { R: 50, RR: 30, AR: 15, SR: 5 } },");
  lines.push("    '10':  { label: 'Slot 10',  description: 'High Rare slot', probabilities: { RR: 85, AR: 10, SR: 3, SAR: 1.5, MUR: 0.5 } },");
  lines.push("  },");
  lines.push("  godPack: { chance: 0.5, description: 'God Pack (AR 1 + SR 5 + SAR 4)' }");
  lines.push("};");

  return lines.join('\n');
}

// ===== Main =====
const outputPath = path.join(__dirname, 'js', 'cards.js');
const content = generate();
fs.writeFileSync(outputPath, content, 'utf-8');

// Stats
for (const set of SETS) {
  const counts = {};
  for (const [,, , r] of set.cards) counts[r] = (counts[r] || 0) + 1;
  console.log(`${set.ourId} (${set.name}): ${set.cards.length} cards`);
  console.log('  Rarity:', JSON.stringify(counts));
}
console.log(`\nGenerated: ${outputPath}`);
