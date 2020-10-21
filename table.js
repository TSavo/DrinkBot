export default class Table {
    static formatTable(items) {
        var message = "";
        var maxLength = 0;
        var lengthArray = [];
        items.forEach((item) => {
            var lineLength = 0;
            Object.entries(item).forEach((element, index) => {
                var str = element[1] + "";
                if (str.length > 100) {
                    str = str.substring(0, 100) + "...";
                }
                lineLength += str.length;
                maxLength = Math.max(maxLength ? maxLength : 0, lineLength);
                lengthArray[index] = Math.max(lengthArray[index] ? lengthArray[index] : 0, str.length);
            });
        });
        message += "```HTML\n";
        message += "+-";
        lengthArray.forEach(len => {
            message += "-".padEnd(len + 1, "-") + "-+";
        });
        message += "\n";
        items.forEach((item) => {
            message += "| ";
            Object.entries(item).forEach((element, index) => {
                var str = element[1] + "";
                if (str.length > 100) {
                    str = str.substring(0, 100) + "...";
                }
                if(element[0] == "name"){
                    str = "<a href='http://test.com'>" + str + "</a>";
                }
                message += " " + str.padEnd(lengthArray[index], " ") + " |";
            });
            message += "\n";
            message += "+-";
            Object.entries(item).forEach((x, index) => {
                message += "-".padEnd(lengthArray[index] + 1, "-") + "-+";
            });
            message += "\n";
        });        
        message += "```";
        return message;
    }
}

