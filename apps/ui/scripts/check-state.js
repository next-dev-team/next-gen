const Conf = require("conf");
const store = new Conf({ projectName: "next-gen-scrum" });
const state = store.get("scrumState");
console.log(JSON.stringify(state, null, 2));
