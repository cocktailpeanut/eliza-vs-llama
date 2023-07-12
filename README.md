# Eliza vs. Llama

> An autonomous chatroom between [Eliza](https://en.wikipedia.org/wiki/ELIZA) and [Llama](https://github.com/ggerganov/llama.cpp)

# How it works

The chat script is [run.json](run.json). Let's walk through each step.


## 0. Set the chatroom topic

You can make Eliza and Llama talk about anything, but we must give them instructions that are as specific as possible.

The default topic is stored in [prompt.json](prompt.json), and this can be dynamically loaded with the `self.prompt` (see https://docs.pinokio.computer/memory/self.html)

This particular step pops up an input box, which displays the `self.prompt.text` content from the [prompt.json](prompt.json) file, and lets you update it if you want.

The updated content will be returned as `input.topic` (Note the form field's key is "topic"), which can be used in the next step.

```json
{
  "method": "input",
  "params": {
    "title": "Chatroom topic",
    "form": [{
      "key": "model",
      "default": "{{self.config.model}}",
      "description": "model (you must install the model first)"
    }, {
      "key": "topic",
      "type": "textarea",
      "default": "{{self.config.prompt}}",
      "description": "Enter the topic of this conversation"
    }]
  }
}
```

## 1. Persist the text attribute inside prompt.json

The [self.set](https://docs.pinokio.computer/api/datastructure.html#self-set) API lets you persist attributes to any JSON file in the repository.

In this case we are using it to save the `prompt` and `model` attributes to [prompt.json](prompt.json) from the return value passed in from the previous step (`{{input.topic}}` and `{{input.model}}`)

```json
{
  "method": "self.set",
  "params": {
    "config.json": {
      "model": "{{input.model}}",
      "prompt": "{{input.topic}}"
    }
  }
}
```

## 2. Initialize an empty "chat" array

```json
{
  "method": "local.set",
  "params": {
    "chat": []
  }
}
```

## 3. Call the start() function inside index.js

Call the start function at [index.js](index.js).

This will return the first message from Eliza (mostly welcome messages)

```json
{
    "uri": "./index.js",
    "method": "start"
}
```

## 4. Add Eliza's message to the chat array

The return value from the previous step will be stored inside a special variable named `input`.

We can use the first message from Eliza by adding it to the `chat` array.

```json
{
  "method": "local.set",
  "params": {
    "eliza": "{{input.eliza}}",
    "chat": "{{local.chat.concat('Eliza: ' + input.message)}}"
  }
}
```

## 5. Display a notification with Eliza's message

We will also display a notification with Eliza's message.


```json
{
  "method": "notify",
  "params": {
    "html": "{{local.chat[local.chat.length-1]}}"
  }
}
```

## 6. Call llamacpp.pinokio's index.js

By referencing the public git uri of a locally installed API (in this case https://github.com/cocktailpeanut/llamacpp.pinokio.git/index.js), you can call the method inside that file.

In this case we are calling the `query()` method inside the `index.js` file.

```json
{
  "uri": "https://github.com/cocktailpeanut/llamacpp.pinokio.git/index.js",
  "method": "query",
  "params": {
    "prompt": [
      "{{self.config.prompt}}",
      "",
      "{{_.takeRight(local.chat, Math.min(20, local.chat.length)).join('\\r\\n')}}",
      "",
      "Llama: "
    ],
    "on": [
      {
        "event": "/.*Llama:(.+?)[\r\n]*###/gs",
        "return": "{{event.matches[0][1]}}"
      },
      {
        "event": "/.*Llama:(.+?)\\[end of text\\]/gs",
        "return": "{{event.matches[0][1]}}"
      },
      {
        "event": "/.*Llama:(.+?)llama_print_timings:/gs",
        "return": "{{event.matches[0][1]}}"
      }
    ],
    "model": "{{self.config.model}}",
    "options": {
      "-c": 2000
    }
  }
}
```

How it works:

1. It locates the API by resolving the local folder downloaded from https://github.com/cocktailpeanut/llamacpp.pinokio.git
2. Then it finds the index.js file inside the repository.
3. Then it sends the `params` object to the `query` method indisde `index.js`
4. The `prompt` is an array of lines for the prompt file, in this case basically asking llama to simulate a conversation between a therapist and a person named Eliza.
5. Note that the third line in the prompt is dynamically generated (with a template) by taking at most the last 20 messages from the chat history (the chat array). This is to provide memory to llama.cpp so it remembers at most last 20 messages.
6. Also note that the first line is the master prompt that sets the main topic of this chat. This prompt is always included at the beginning, followed by the last 20 messages from above. The `self.config.prompt` is dynamically loaded from the [config.json](config.json) file at runtime.
7. The `on` array is used by the `llamacpp.pinokio` module to automatically parse realtime stream. Whenever it discovers an incoming message that matches one of the `event` regular expressions, it returns with the `return` value (where the regular expression matches are stored in `event.matches`)
8. The `options` attribute is used to tweak the commandline arguments for llama.cpp. You can look up all the available llama.cpp commandline args and use them here.

Basically the gist is, this step sends the last 20 messages from the chat history to llama, and asks it to generate the next message from "Llama:".

## 7. Add Llama's message to the chat array

The next step adds the return value from the previous step `input` (which is a message from llama) to the `chat` array. 


```json
{
  "method": "local.set",
  "params": {
    "llamareply": "{{input}}",
    "chat": "{{local.chat.concat('Llama: ' + input)}}"
  }
}
```

## 8. Display llama's message

Now we display llama's message with the notify api

```json
{
  "method": "notify",
  "params": {
    "html": "{{local.chat[local.chat.length-1]}}"
  }
}
```

## 9. Wait 5 seconds

This step is not really necessary but I found it better to wait 5 seconds before going to the next step, because unlike Llama, Eliza responds immediately so it doesn't really feel human. Giving a 5 second pause makes it feel like Eliza is actually thinking, making the conversation feel more natural.

```json
{
  "method": "process.wait",
  "params": {
    "sec": 5
  }
}
```

## 10. Call the reply() method inside index.js

Now we call Eliza's reply() method inside [index.js](index.js).

This creates a response from Eliza.

```json
{
  "uri": "./index.js",
  "method": "reply",
  "params": {
    "eliza": "{{local.eliza}}",
    "message": "{{local.llamareply}}"
  }
}
```

## 11. Loop forever

First time in the loop at this point, we will have:

1. Eliza's welcome message
2. Llama's response
3. Eliza's response to Llama's response

Now we just need to loop back to Llama with the last response from Eliza.

Just like that we have a chatroom between Eliza and Llama, talking forever.


```json
{
  "method": "goto",
  "params": {
    "index": 2,
    "input": "{{input}}"
  }
}
```

You can always stop the chat by pressing the stop button.

# Credits

1. Using https://github.com/brandongmwong/elizabot-js for Eliza code
2. and of course [Llama.cpp](https://github.com/ggerganov/llama.cpp) that powers it all
