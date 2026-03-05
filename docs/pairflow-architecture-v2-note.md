# Pairflow Architecture v2 Note

Status: draft note  
Date: 2026-03-05

## Why this note exists

Pairflow started as a relatively simple system, but after adding many features it is becoming harder to reason about.
The current direction feels increasingly patchwork-like, so we should revisit the architecture after finishing the current change.

## Current concern to keep in mind

For docs-only scenarios, new behavior should extend existing logic, not silently overwrite global behavior.
Right now, the scope boundary between docs-specific logic and system-wide logic is not always obvious.

## v2 intention (high level)

We want a model that is both simpler and more flexible:

- clearer terms and boundaries,
- easier-to-follow decision paths,
- less duplicated policy logic across commands,
- explicit separation between docs-only extensions and global runtime behavior.

## Timing

No architecture migration is planned in this note right now.
This is a reminder to run a focused Architecture v2 design pass immediately after the current doc-contract-gates implementation is closed.

## Ideas

So we need to think about how the V2 architecture should enable us to configure the v1 version of Pairflow and any other workflow.
Another idea is that we need to think about that. Right now, we have this idea that we have the current reviewer, and there is a review I'm doing right now manually. In many cases, that manual review is just kind of accepting what the coding agents suggest from a rework perspective, usually. The new version should enable adding additional steps as well.
Another idea that I heard was that there was an interesting case when I think it was an entropic engineer defined a huge task. When the coding agent was confused, based on blame, it figured out which engineer wrote a specific code, and it reached out on Slack to get the answer. I like this idea, and I was thinking it would be very nice that, for example, if the agent needs help, then that can be a state transition into "I need help" mode. That mode can trigger a subworkflow where, for example, he tries to reach out to me on Slack and say, "Hey, can you please ask for me just this question?" so then I can go back and continue the work or something like that. I think enabling this would be just super super cool. And of course the medium is not important here, because I can imagine that the same workflow could happen, for example, that I trigger the whole process, for example, on Github as a Github issue. Whenever the agent needs some information, he just adds a comment and mentions me, and if I answered that comment, then that answer is sent to the workflow. So this is kinda, so we need to think through this, but it's kind of like right now. Now we have this CLI-based core, and that would mean that when the workflow is running, it is possible to interact with it from different communication channels. The message goes through the workflow, the current instance of the workflow, and it can figure out how to deal with that piece of information.
One more idea here. I'm not sure whether it's a good or bad idea, but I was thinking that one key design perspective of Bareflow is that it's agent-first, so the agent can manipulate the whole bubble. On the other hand, theoretically, when the subject agent of the bubble could manipulate the bubble in a way that it shouldn't be supposed to do this, never happened. I'm curious whether there would be an easy way to make sure that those agents who are only the subject of one specific part of the workflow cannot, for example, run workflow manipulation commands which are not suitable to that specific point of the workflow. I think it's very different that, for example, if I'm using a coding agent to create the bubble and to manipulate the bubble, so that agent acts on my behalf. It's very different that, for example, the implementer or the receiver, the reviewer, could, for example, invite the delete bubble, which never happened. Not because it is not possible, but because the agent didn't decide to do it.
So another idea is that when I see, for example, some files like convergence policy, it seems like it is more and more complex as we add more and more stuff to it. Probably we would need some kind of, maybe not plugin system is the best word for it, but it would be nice if there is some kind of general governance policy infrastructure. I can add some new modules to it or plugins, which means that each plugin is kind of logical on its own, but they are not necessarily interconnected. I think right now an issue is that many of the logic is super interconnected, and this is why it is quite hard to add new functionality in a way that it's easy to comprehend.
