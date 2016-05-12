# i-crush-on-mobcrush

This was a short project to hack mobcrush's website. When the user hovers over a broadcast tile, the most recent chat messages will slide up from the bottom, giving the user an idea of the engagement within that channel.

![Broadcast Tile Chat](http://i-crush-on-mobcrush.herokuapp.com/images/tilechat.png "Broadcast Tile Chat")

* Created a proxy server to pass requests from the client directly on to mobcrush.com. This way I only had to host the few files that were directly relevant to my hack. (https://github.com/nodejitsu/node-http-proxy)
* Created a template "app/components/chatMessages.html". This is a light weight version of the full chat ("app/components/chat.html"), showing only the 5 most recent messages.
* Modified "app/components/broadcastTile.html" to render the chatMessages template when the stream is live.
* Added a some css to make the chat messages show or hide on hover/mouseout for each live channel.
* Multiple chat rooms now all initialize at the same time when the page is loaded (one room per broadcast channel).
* Promisified the chat authenticate method so multiple instances attempting to initialize will share the same single auth token when it is ready.

Things I learned:
* Overall this was a great refresher on Angular.
* Debugging Angular scope - Pick an element in the HTML panel of the developer tools and type this in the console: `angular.element($0).scope()`

All code for this hack is available on my github. The salient files are located [here](https://github.com/ConstableBrew/mobcrush-video/tree/master/app).

# HTML5 Video and MPEG-TS

[Convert mpeg-ts chunks on the fly!](http://i-crush-on-mobcrush.herokuapp.com/video_conversion.html)


JWPlayer is the standard in playing videos on the web. <i>But</i>, sometimes it is fun to explore other options. In this demo, I use the nifty MPEGTS-to-MP4 converter, a pure JavaScript library that converts MPEG-TS video chunks into MPEG-4 and playing them.