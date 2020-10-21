import Discord from "discord.js";
import axios from "axios";
import cheerio from "cheerio";
import luxon from "luxon";
const {
    DateTime
} = luxon;

const storeImages = {
    "K&L Wines": "https://pbs.twimg.com/profile_images/378800000144695467/f2a35e2847d71bcd32b77a9f73f0d45b_400x400.png",
    "Bitters And Bottles": "https://cdn.knoji.com/images/logo/bittersandbottlescom.jpg",
    "Seelbach's": "https://cdn.shopify.com/s/files/1/1829/2275/files/seelbachs_final_BW_300x.jpg?v=1572457767",
    "Woodland Hills Wine Company":"https://scontent-lax3-1.xx.fbcdn.net/v/t1.0-9/998644_10151749884251644_796753210_n.jpg?_nc_cat=105&_nc_sid=85a577&_nc_ohc=qgImdg6DGj8AX8AWmhN&_nc_ht=scontent-lax3-1.xx&oh=934cf3397c3ba6fb15a93b6c1ded1489&oe=5FB64294"
};

const searchUrls = {
    "K&L Wines":"https://www.klwines.com/Products?searchText=",
    "Seelbach's":"https://seelbachs.com/search?q=",
    "Woodland Hills Wine Company":"https://whwc.com/search?search_query=",
    "Bitters And Bottles":"https://www.bittersandbottles.com/search?type=product&q="
};

export default class Item {
    constructor(releaseDate, sku, vintage, name, price, quantity, allocation, store, url, image) {
        if (releaseDate && releaseDate.sku > 0) {
            this.releaseDate = releaseDate.releaseDate;
            this.sku = releaseDate.sku;
            this.vintage = releaseDate.vintage;
            this.name = releaseDate.name;
            this.price = releaseDate.price;
            this.quantity = releaseDate.quantity;
            this.allocation = releaseDate.allocation;
            this.store = releaseDate.store;
            this.url = releaseDate.url;
            this.image = releaseDate.image;
        } else {
            this.releaseDate = releaseDate;
            this.sku = sku;
            this.vintage = vintage;
            this.name = name;
            this.price = price;
            this.quantity = quantity;
            this.allocation = allocation;
            this.store = store;
            this.url = url;
            this.image = image;
        }
    }

    getEmbed() {
        const fields = [{
            name: "Price",
            value: (isNaN(parseFloat(this.price)) ? "" : "$") + this.price,
            inline: true
        }];
        if (this.quantity) {
            fields.push({
                name: "Quantity",
                value: (this.quantity + "").replace(">", "\\>"),
                inline: true
            });
        }
        if (this.allocation && this.allocation > 0) {
            fields.push({
                name: "Allocation",
                value: this.allocation,
                inline: true
            });
        }
        if (this.vintage && this.vintage > 0) {
            fields.push({
                name: "Vintage",
                value: this.vintage,
                inline: true
            });
        }
        if (this.store && this.store.length > 0) {
            fields.push({
                name: "Store",
                value: this.store,
                inline: true
            });
        }
        const embed = new Discord.MessageEmbed()
            .setColor('#0099ff')
            .setTitle(this.name)
            .setURL(this.url)
            .setThumbnail(storeImages[this.store])
            .addFields(fields)
            .setImage(this.image)
            .setTimestamp(this.releaseDate ? this.releaseDate : new Date());
        return embed;
    }
}

async function fetchHTML(url) {
    const {
        data
    } = await axios.get(url);
    return cheerio.load(data);
}

export function getItemResultEmbed(name, items, keyword) {
    const fields = items.flatMap(item => {
        const field = [{
                name: "Name",
                value: "[" + item.name + "](" + item.url + ")"
            },
            {
                name: "Price",
                value: (isNaN(parseFloat(item.price)) ? "" : "$") + item.price,
                inline: true
            }
        ];
        if (item.vintage) {
            field.push({
                name: "Vintage",
                value: item.vintage,
                inline: true
            });
        }
        if (item.quantity) {
            field.push({
                name: "Quantity",
                value: ("" + item.quantity).replace(">", "\\>"),
                inline: true
            });
        }
        if (item.allocation) {
            field.push({
                name: "Allocation",
                value: item.allocation,
                inline: true
            });
        }
        if(item.store) {
            field.push({
                name: "Store",
                value: item.store,
                inline:true
            });
        }
        return field;
    });
    const embed = new Discord.MessageEmbed()
        .setColor('#0099ff')
        .setTitle(name)
        .setURL(searchUrls[items[0].store] + keyword)
        .setThumbnail(storeImages[items[0].store])
        .addFields(fields)
        //.setImage('https://klwines.com/Content/images/logo_new.svg')
        .setTimestamp();
    return embed;
}

export async function getKLSearchResults(keyword) {
    const $ = await fetchHTML("https://klwines.com/Products?searchText=" + keyword);
    const content = $(".tf-product");
    const items = [];
    content.each((index, element) => {
        const header = $(element).find(".tf-product-header");
        let name = header.text().trim();
        const sku = header.find("a").get(0).attribs.href.match(/(i|sku)=([0-9]*)/)[2];
        let vintage = name.match(/^[0-9]*/);
        if (vintage[0].length > 0) {
            vintage = vintage[0].trim();
            name = name.split(/^[0-9]*/)[1].trim();
        } else {
            vintage = undefined;
        }
        const price = $(element).find(".tf-price").text().replace("Starting Bid:", "").replace("Price:", "").replace("$", "").trim();
        items.push(new Item(undefined, sku, vintage, name, price, undefined, undefined, "K&L Wines", "https://klwines.com/p/i?i=" + sku));
    });
    return items;
}

export async function getKLNewItems() {
    const $ = await fetchHTML("https://klwines.com/Products?filters=sv2_NewProductFeedYN%24eq%241%24True%24ProductFeed%24!dflt-stock-all&orderBy=NewProductFeedDate%20desc&limit=50");
    let items = [];
    $('tr').each((index, tr) => {
        let releaseDate;
        let sku;
        let vintage;
        let name;
        let price;
        let quantity;
        let allocation;
        $(tr).find("td").each((index, element) => {
            switch (index) {
                case 0:
                    releaseDate = new Date();
                    break;
                case 1:
                    sku = $(element).text().trim();
                    break;
                case 2:
                    vintage = $(element).text().trim();
                    break;
                case 3:
                    name = $(element).text().trim();
                    break;
                case 4:
                    price = $(element).text().trim().replace("$", "");
                    break;
                case 5:
                    quantity = $(element).text().trim();
                    break;
                case 6:
                    allocation = $(element).text().trim();
                    break;
            }
        });
        const item = new Item(releaseDate, sku, vintage, name, price, quantity, allocation, "K&L Wines", "https://klwines.com/p/i?i=" + sku, "https://cdn.klwines.com/images/skus/" + sku + "l.jpg");
        items.push(item);
    });
    return items.filter(item => {
        return item.name;
    });

}

export async function getBABNewItems() {
    const $ = await fetchHTML("https://www.bittersandbottles.com/collections/new-arrivals?sort_by=created-descending");
    let items = [];
    $('li.productgrid--item').each((index, li) => {
        
        $(li).find("script").each((index, element) => {
            if(element.children[0].data.trim().startsWith("{")){
                const data = JSON.parse(element.children[0].data.trim());
                if(data.id){
                    let price = (data.price / 100).toFixed(2);
                    let name = data.title;
                    let releaseDate = new Date();
                    let url = "https://www.bittersandbottles.com/products/" + data.handle;
                    let image = "https:" + data.images[0];
                    let quantity = data.variants[0].inventory_quantity;
                    let sku = data.variants[0].sku;
                    items.push(new Item(releaseDate, sku, undefined, name, price, quantity, undefined, "Bitters And Bottles", url, image));
                }
            }
            
        });
    });
    return items;
}

export async function getBABSearchResults(keyword) {
    const $ = await fetchHTML("https://www.bittersandbottles.com/search?type=product&q=" + keyword);
    let items = [];
    $('li.productgrid--item').each((index, li) => {
        $(li).find("script").each((index, element) => {
            if(element.children[0].data.trim().startsWith("{")){
                const data = JSON.parse(element.children[0].data.trim());
                if(data.id){
                    let price = (data.price / 100).toFixed(2);
                    let name = data.title;
                    let releaseDate = new Date();
                    let url = "https://www.bittersandbottles.com/products/" + data.handle;
                    let image = "https:" + data.images[0];
                    let quantity = data.variants[0].inventory_quantity;
                    let sku = data.variants[0].sku;
                    items.push(new Item(releaseDate, sku, undefined, name, price, quantity, undefined, "Bitters And Bottles", url, image));
                }
            }
            
        });
    });
    return items;
}

export async function getSeelbachsNewItems() {
    const $ = await fetchHTML("https://seelbachs.com/collections/frontpage?sort_by=created-descending");
    let items = [];
    $('.grid-view-item__link').each((index, item) => {
        const image = "https:" + $(item).find(".grid-view-item__image")[0].attribs.src;
        const name = $(item).find(".grid-view-item__image")[0].attribs.alt;
        const price = parseFloat($($(item).find(".product-price__price")[0]).text().trim().replace("$", "")).toFixed(2);
        const quantity = $(item).find(".product-price__sold-out").length > 0 ? 0 : 1;
        const sku = $(item).find(".product-form")[0].attribs["data-productid"];
        const url = "https://seelbachs.com" + item.attribs.href.replace("collections/frontpage/", "");
        const releaseDate = new Date();
        items.push(new Item(releaseDate, sku, undefined, name, price, quantity, undefined, "Seelbach's", url, image));
       
    });
    return items;
}

export async function getSeelbachsSearchResults(keyword) {
    const $ = await fetchHTML("https://seelbachs.com/search?q=" + keyword);
    let items = [];
    $('.list-view-item').each((index, item) => {
        const imageElement = $(item).find(".list-view-item__image")[0];
        if(!imageElement){
            return;
        }
        const image = "https:" + imageElement.attribs.src;
        const name = imageElement.attribs.alt;
        const price = parseFloat($($(item).find(".product-price__price")[0]).text().trim().replace("$", "")).toFixed(2);
        const sku = $(item).find(".product-form")[0].attribs["data-productid"];
        const url = "https://seelbachs.com" + item.attribs.href.replace("collections/frontpage/", "");
        const releaseDate = new Date();
        items.push(new Item(releaseDate, sku, undefined, name, price, undefined, undefined, "Seelbach's", url, image));
    });
    return items;
}

export async function getWHWCNewItems() {
    const items = [];
    const {
        data
    } = await axios.get("https://api.searchspring.net/api/search/search.json?ajaxCatalog=v3&resultsFormat=native&siteId=rn9t48&domain=https%3A%2F%2Fwhwc.com%2Ftrending%2Fwhats-new%2Fnew-arrivals-this-week%2F&bgfilter.categories_hierarchy=Trending%3EWhat%27s%20New%3ENew%20Arrivals%20This%20Week&q=&userId=V3-8387EF88-B261-43F9-BAC4-3F68DF1E3C40&tracking=true");
    data.results.forEach(item => {
        const image = item.imageUrl;
        const name = item.name;
        const sku = item.sku;
        const url = item.url;
        const quantity = item.qtydisplay;
        const price = item.price;
        const store = "Woodland Hills Wine Company";
        items.push(new Item(new Date(), sku, undefined, name, price, quantity, undefined, store, url, image));
    });
    let nextPage = data.pagination.nextPage;
    while(nextPage != 0){
        const {
            data2
        } = await axios.get("https://api.searchspring.net/api/search/search.json?ajaxCatalog=v3&resultsFormat=native&siteId=rn9t48&domain=https%3A%2F%2Fwhwc.com%2Ftrending%2Fwhats-new%2Fnew-arrivals-this-week%2F%3Fp%3D2&bgfilter.categories_hierarchy=Trending%3EWhat%27s%20New%3ENew%20Arrivals%20This%20Week&q=&page=2&userId=V3-8387EF88-B261-43F9-BAC4-3F68DF1E3C40&tracking=true");
        if(!data2){
            nextPage = 0;
            continue;
        }
        data2.results.forEach(item => {
            const image = item.imageUrl;
            const name = item.name;
            const sku = item.sku;
            const url = item.url;
            const quantity = item.qtydisplay;
            const price = item.price;
            const store = "Woodland Hills Wine Company";
            items.push(new Item(new Date(), sku, undefined, name, price, quantity, undefined, store, url, image));
        });
        nextPage = data2.pagination.nextPage;
    }
   
    return items;
}

export async function getWHWCSearchResults(keyword){
    const items = [];
    const {
        data
    } = await axios.get("https://api.searchspring.net/api/search/search.json?ajaxCatalog=v3&resultsFormat=native&siteId=rn9t48&domain=https%3A%2F%2Fwhwc.com%2Fsearch%3Fsearch_query%3Dlittle&q=" + keyword + "&userId=93F386F2-55CC-41F3-92A6-0743C05569E9&tracking=true");
    data.results.forEach(item => {
        const image = item.imageUrl;
        const name = item.name;
        const sku = item.sku;
        const url = item.url;
        const quantity = item.qtydisplay;
        const price = item.price;
        const store = "Woodland Hills Wine Company";
        items.push(new Item(new Date(), sku, undefined, name, price, quantity, undefined, store, url, image));
    });
    if(items.length > 8){
        return items.slice(0,7);
    }
    return items;

}

