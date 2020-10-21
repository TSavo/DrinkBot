import Discord from "discord.js";
import MongoDB from "./mongodb.js";
import Table from "./table.js";
import Item, {
    getKLNewItems,
    getKLSearchResults,
    getBABNewItems,
    getBABSearchResults,
    getSeelbachsNewItems,
    getSeelbachsSearchResults,
    getWHWCNewItems,
    getWHWCSearchResults,
    getItemResultEmbed
} from "./Item.js";
import asyncForEach from "./asyncForEach.js";

const searchUrls = {
    "K&L Wines":"https://www.klwines.com/Products?searchText=",
    "Seelbach's":"",
    "Woodland Hills Wine Company":"https://whwc.com/search?search_query=",
    "Bitters And Bottles":""
};

async function start() {
    const db = new MongoDB();
    await db.init();
    const newFeed = db.getCollection("newFeed");
    const userAlerts = db.getCollection("userAlerts");
    const client = new Discord.Client();
    const showAlertsForUser = async (userId, channel) => {
        const alerts = (await userAlerts.find({
            userId: userId,
            channel: channel.id
        }).toArray()).map(alert => [alert.match]);
        if (alerts.length == 0) return await channel.send("You have no new feed alerts.");
        await channel.send(Table.formatTable(alerts));
    };
    setInterval(async () => {
        const getters = [getKLNewItems, getBABNewItems, getSeelbachsNewItems, getWHWCNewItems];
        getters.asyncForEach(async getter => {
            const items = await getter();
            await items.asyncForEach(async item => {
                const old = await newFeed.find({
                    sku: item.sku,
                    store: item.store
                }).toArray();
                if (old.length > 0) {
                    return;
                }
                await newFeed.insertOne(item);
            });
        });

        const alerts = await userAlerts.find().toArray();
        await alerts.asyncForEach(async alert => {
            let items = await newFeed.find({
                releaseDate: {
                    $gt: alert.lastSeen
                },
                name: {
                    '$regex': alert.match,
                    '$options': 'i'
                }
            }).sort({
                releaseDate: -1
            }).toArray();
            if (items.length == 0) {
                return;
            }
            await userAlerts.updateOne(alert, {
                $set: {
                    lastSeen: new Date()
                }
            });
            await asyncForEach(items, async item => {
                await (await client.channels.fetch(alert.channel)).send("<@" + alert.userId + ">, your new alert for " + alert.match + " matched the following:");
                await (await client.channels.fetch(alert.channel)).send(new Item(item).getEmbed());
            });
        });
    }, 5000);
    client.on("message", async function (message) {
        if (message.author.bot) return;
        const prefix = "!";
        if (!message.content.startsWith(prefix)) return;
        const commandBody = message.content.slice(prefix.length);
        const args = commandBody.split(' ');
        const command = args.shift().toLowerCase();
        if (command === "search") {
            let keyword = args.join(" ").trim();
            const getters = [getKLSearchResults, getSeelbachsSearchResults, getBABSearchResults, getWHWCSearchResults];
            getters.asyncForEach(async getter =>{
                let items = await getter(keyword);
                if (items.length > 8) {
                    items = items.slice(0, 7);
                }
                if(items.length == 0){
                    return;
                }
                let embed = getItemResultEmbed(items[0].store + " Search Results for '" + keyword + "'", items, "https://www.klwines.com/Products?searchText=" + keyword);        
                await message.channel.send(embed);
            });
        }
        if (command === "whwc") {
            await getWHWCNewItems();
        }
        if (command === "help") {
            const table = [];
            table.push(["Command", "Arguments", "Description"]);
            table.push(["!search", "keyword", "Performs a search for keyword and returns the top results."]);
            table.push(["!new", "[search terms]", "Shows the top 8 items from the new feed that match the optional search terms."]);
            table.push(["!list-new-alerts", "", "Shows you the list of new alerts you have in this channel."]);
            table.push(["!add-new-alert", "keyword", "Adds an alert in this channel on items that match that keyword."]);
            table.push(["!remove-new-alert", "keyword", "Removes an alert in this channel by it's keyword."]);

            await message.channel.send(Table.formatTable(table));
        }
        if (command == "list-new-alerts") {
            await showAlertsForUser(message.author.id, message.channel);
        }
        if (command === "add-new-alert") {
            const alert = args.join(" ");
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate()-1);
            const alertEntry = {
                userId: message.author.id,
                guild: message.channel.guild.id,
                channel: message.channel.id,
                match: alert,
                lastSeen: yesterday
            };
            await userAlerts.updateOne(alertEntry, [{
                $replaceRoot: {
                    newRoot: alertEntry
                }
            }], {
                upsert: true
            });
            await message.channel.send("Ok, I've added an alert in this channel for anything matching " + alert + ". Here are your new feed alerts from the past 24 hours:");
            await showAlertsForUser(message.author.id, message.channel);
        }
        if (command === "remove-new-alert") {
            const alert = args.join(" ").trim();
            const alertEntry = {
                userId: message.author.id,
                guild: message.channel.guild.id,
                channel: message.channel.id,
                match: {
                    $regex: alert,
                    $options: "i"
                }
            };
            const result = await userAlerts.deleteOne(alertEntry);
            if (result.deletedCount > 0) {
                await message.channel.send("Ok, I've removed " + result.deletedCount + " alert" + (result.deletedCount > 1 ? "s" : "") + " in this channel for anything matching " + alert + ". Here are your remaining alerts:");
            } else {
                await message.channel.send("That didn't match any alert you have set up in this channel. Here are the alerts you have.");
            }
            await showAlertsForUser(message.author.id, message.channel);
        }
        if (command === "new") {
            let items = newFeed.find().sort({
                releaseDate: -1
            });
            if (args[0] && args[0].length > 0) {
                items = await items.filter({
                    name: {
                        $regex: args[0],
                        $options: "i"
                    }
                }).limit(8).toArray();
            } else {
                items = await items.limit(8).toArray();
            }
            const embed = getItemResultEmbed("New Items", items);
            await message.channel.send(embed);
        }
    });
    console.log(process.env.DISCORD_API_KEY);
    client.login(process.env.DISCORD_API_KEY).catch(console.log);
    //client.login("NzYzNTg3NzQ1OTM4NTM4NTI5.X354gQ.-goiz1Arqa4h-OlwumehkedoK_o").catch(e => console.log);
}
start().catch(e => console.log);