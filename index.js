const TelegramBot = require('node-telegram-bot-api');
const cryptojs = require('crypto-js');
const config = require('./config');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const adapter = new FileSync('db.json');
global.db = low(adapter);

const bot = new TelegramBot(config.botToken, { polling: true });
const util = require('./util');
const {getForwardChat} = require("./util");

function base64_encode(filepath) {
    return fs.readFileSync(filepath, { encoding: 'base64' });
}
async function wait(timeout) {
    return new Promise(resolve => setTimeout(() => {
        resolve();
    }, timeout));
}

async function encipherAfterTimeout(callbackQuery, text)
{
    await wait(util.getTimeout());
    let _cipherKey = util.getCipherKey();
    let encipheredText = cryptojs.AES.encrypt(text, util.getCipherKey()).toString();
    await bot.editMessageText(encipheredText,
        {
            message_id: callbackQuery.message.message_id,
            chat_id: util.getForwardChat(),
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: 'decipher',
                            callback_data: 'on_decipher_user'
                        }
                    ]
                ]
            }
        });
}

bot.on('message', async (msg) => {
    const opts = {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'decipher', callback_data: 'on_decipher_user' }]
            ]
        }
    }

    try {
        if (msg.photo) {
                let encipheredText = "";
                if(msg.caption) {
                    if(msg.caption.indexOf('/say') > -1) {
                        encipheredText = msg.caption.replace('/say ', '');
                        encipheredText += '\n';
                    }
                }

                let photo = await bot.getFile(msg.photo[msg.photo.length - 1].file_id);
                let downloaded = await bot.downloadFile(photo.file_id, './');
                let baseencoded = base64_encode(`./${downloaded}`);

                const form = new FormData();
                form.append('image', baseencoded);

                const response = await axios.post(
                    'https://api.imgbb.com/1/upload',
                    form,
                    {
                        params: {
                            'expiration': util.getExpirationTimeout(),
                            'key': config.imgdbbApiKey
                        },
                        headers: {
                            ...form.getHeaders()
                        }
                    }
                ).then(r => r.data);

                encipheredText += `\n${response.data.image.url}`;
                fs.rm(`./${downloaded}`, (error) => {
                });

                encipheredText = cryptojs.AES.encrypt(encipheredText, util.getCipherKey()).toString();

                await bot.sendMessage(util.getForwardChat(), encipheredText, opts);
        } else {
            let encipheredText = msg.text.replace('/say ', '');
            encipheredText = cryptojs.AES.encrypt(encipheredText, util.getCipherKey()).toString();

            await bot.sendMessage(util.getForwardChat(), encipheredText, opts);
        }
    }catch(error){ }
});

bot.on('callback_query', async function on_decipher_user(callbackQuery){
    if(bot.getChatMember(getForwardChat(), callbackQuery.from.id)){
        var bytes = cryptojs.AES.decrypt(callbackQuery.message.text, util.getCipherKey());
        var decipheredText = bytes.toString(cryptojs.enc.Utf8);

        await bot.editMessageText(decipheredText, {
            message_id: callbackQuery.message.message_id,
            chat_id: util.getForwardChat()
        });

        await encipherAfterTimeout(callbackQuery, decipheredText);
    }
});

bot.onText(/\/change_key (.+)/, async (msg, match) => {
    await bot.sendMessage(msg.chat.id, util.changeCipherKey(msg.chat.id, match[1]));
});

bot.onText(/\/change_chat (.+)/, async (msg, match) => {
   await bot.sendMessage(msg.chat.id, util.changeForwardChat(msg.chat.id, match[1]));
});

bot.onText(/\/add_admin (.+)/, async (msg, match) => {
   await bot.sendMessage(msg.chat.id, util.addAdmin(match[1]));
});

bot.onText(/\/remove_admin (.+)/, async (msg, match) => {
    await bot.sendMessage(msg.chat.id, util.removeAdmin(match[1]));
});

bot.onText(/\/change_timeout (.+)/, async (msg, match) => {
    await bot.sendMessage(msg.chat.id, util.changeTimeout(msg.chat.id, match[1]));
});

bot.on('polling_error', console.log)