// src/services/messageFormatter.js

class MessageFormatter {
    static formatMessage(message) {
        if (!message) return '';

        // Replace placeholders with WhatsApp markdown
        return message
            // Bold: **text** atau *text*
            .replace(/\*\*(.*?)\*\*/g, '*$1*')  
            
            // Italic: __text__ atau _text_
            .replace(/__(.*?)__/g, '_$1_')      
            
            // Strikethrough: ~~text~~
            .replace(/~~(.*?)~~/g, '~$1~')      
            
            // Monospace: ```text```
            .replace(/```(.*?)```/g, '```$1```')
            
            // Handle emoji codes seperti :smile:, :heart:, dll
            .replace(/:([\w+-]+):/g, (match, code) => {
                const emojiMap = {
                    ':fire:': '🔥',
                    ':smile:': '😊',
                    ':heart:': '❤️',
                    ':check:': '✅',
                    ':x:': '❌',
                    ':star:': '⭐',
                    ':laugh:': '😂',
                    ':wink:': '😉',
                    ':cry:': '😢',
                    ':angry:': '😠',
                    ':cool:': '😎',
                    ':love:': '😍',
                    ':surprise:': '😮',
                    ':thinking:': '🤔',
                    ':clap:': '👏',
                    ':pray:': '🙏',
                    ':rocket:': '🚀',
                    ':warning:': '⚠️',
                    ':info:': 'ℹ️',
                    ':phone:': '📱',
                    ':mail:': '📧',
                    ':calendar:': '📅',
                    ':time:': '⌚',
                    ':money:': '💰',
                    ':ok:': '👌',
                    ':new:': '🆕',
                    ':free:': '🆓',
                    'grin': '😁',
                    'wink': '😉',
                    'star_eyes': '🤩',
                    'sweat_smile': '😅',
                    'sleepy': '😴',
                    'relieved': '😌',
                    'neutral_face': '😐',
                    'confused': '😕',
                    'angry': '😠',
                    'scream': '😱',
                    'poop': '💩',
                    'clown': '🤡',
                    'alien': '👽',
                    'ghost': '👻',
                    'skull': '💀',
                    'sun': '☀️',
                    'moon': '🌙',
                    'cloud': '☁️',
                    'umbrella': '☂️',
                    'coffee': '☕',
                    'soccer_ball': '⚽',
                    'basketball': '🏀',
                    'football': '🏈',
                    'trophy': '🏆',
                    'medal': '🏅',
                    'apple': '🍎',
                    'banana': '🍌',
                    'pizza': '🍕',
                    'cake': '🍰'

                    // Tambahkan emoji lain sesuai kebutuhan
                };
                return emojiMap[code] || match;
            });
    }

    static previewFormat(message) {
        // Tampilkan preview format tanpa mengirim
        const formatted = this.formatMessage(message);
        return {
            original: message,
            formatted: formatted,
            formatting: {
                bold: (message.match(/\*\*(.*?)\*\*/g) || []).length,
                italic: (message.match(/__(.*?)__/g) || []).length,
                strikethrough: (message.match(/~~(.*?)~~/g) || []).length,
                monospace: (message.match(/```(.*?)```/g) || []).length,
                emojis: (message.match(/:([\w+-]+):/g) || []).length
            }
        };
    }

    static examples() {
        return {
            "Bold": "**Teks Bold**",
            "Italic": "__Teks Italic__",
            "Strikethrough": "~~Teks Dicoret~~",
            "Monospace": "```Teks Monospace```",
            "Mixed": "**Bold** dan __Italic__ :smile:",
            "WithEmojis": "Hello :smile: dengan :heart:",
            "ComplexFormat": "**Pengumuman Penting** :warning:\n__Harap Dibaca__ :info:"
        };
    }
}

module.exports = MessageFormatter;