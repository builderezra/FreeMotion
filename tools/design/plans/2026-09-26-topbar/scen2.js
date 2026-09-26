const sleep = ms => new Promise(r => setTimeout(r, ms));
const home = __fixedList();
FM.home.close({ push: true }); await sleep(1500);
const proj = __fixedList();
return { home, proj };
