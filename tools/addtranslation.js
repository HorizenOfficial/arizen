const LANGDIR = __dirname + "/../app/lang";

const jsonfileplus = require("json-file-plus");
const argv = require("yargs").argv;

if (argv._.length !== 2) {
    console.log(`Usage: ${argv.$0} key value`);
    process.exit(1);
}

const key = argv._[0];
const value = argv._[1];

const parts = key.split(".");
const root = {};
let curnode = root;
for (let i = 0; i < parts.length - 1; i++) {
    const newnode = {};
    curnode[parts[i]] = newnode;
    curnode = newnode;
}
curnode[parts[parts.length - 1]] = value;

(async () => {
    const main = await jsonfileplus(LANGDIR + "/lang_en.json");
    main.set(root);
    await main.save();
})();
