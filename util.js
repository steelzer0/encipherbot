const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const adapter = new FileSync('db.json');
global.db = low(adapter);

function addAdmin(id)
{
    global.db.get('adminPrivilege').push({ "userId": id }).write();
}

function removeAdmin(id)
{
    global.db.get('adminPrivilege').remove({ "userId": id }).write();
}

function changeCipherKey(id, key)
{
    if(global.db.get('adminPrivilege').filter({ "userId": id }).value().length > 0) {
        global.db.set('cipherKey', key).write();
        return "Cipher key successfully changed!";
    }
    else
        return "You don't have privilege to do this in your chat!";
}

function getCipherKey()
{
    return global.db.get('cipherKey').value();
}

function changeForwardChat(id, chatId)
{
    if(global.db.get('adminPrivilege').filter({ "userId": id }).value().length > 0) {
        global.db.set('chatTo', chatId).write();
        return `You've successfully changed chatId to ${chatId}`;
    }
    else
        return "You don't have privilege to do this in your chat!";
}

function getForwardChat()
{
    return global.db.get('chatTo').value();
}

function changeTimeout(id, time)
{
    time = Number(time);
    if(global.db.get('adminPrivilege').filter({ "userId": id }).value().length > 0) {
        global.db.set('viewTimeout', time).write();
        return `You've successfully changed timeout of viewing to ${time}`;
    }
    else
        return "You don't have privilege to do this in your chat!";
}

function getTimeout()
{
    return global.db.get('viewTimeout').value();
}

function getExpirationTimeout()
{
    return global.db.get('imageExpirationTimeout').value();
}

module.exports = { addAdmin, removeAdmin, changeCipherKey, getCipherKey, changeForwardChat, getForwardChat, changeTimeout, getTimeout, getExpirationTimeout }