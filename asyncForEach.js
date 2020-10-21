export default async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
    }
}

Array.prototype.asyncForEach = async function (callback) {
    await asyncForEach(this, callback);
};