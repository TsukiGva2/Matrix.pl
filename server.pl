#!/usr/bin/env swipl

:- use_module(library(main)).
:- use_module(library(http/websocket)).
:- use_module(library(http/thread_httpd)).
:- use_module(library(http/http_dispatch)).
:- use_module(library(http/json)).
:- use_module(library(term_to_json)).

:- use_module(matriz).

:- http_handler(root(ws),
                http_upgrade_to_websocket(listen, []),
                [spawn([])]).

:- initialization(main, main).

listen(WebSocket) :-
    ws_receive(WebSocket, Message),
    (   Message.opcode == close
    ->  true
    ;   process_message(Message.data, Response),
        ws_send(WebSocket, json(Response)),

        listen(WebSocket)
    ).

main(_) :-
    http_server(http_dispatch, [port(4000)]),

    thread_get_message(quit). % hang

process_message(JSON, Response) :-
    atom_json_dict(JSON, Data, []),
    dict_keys(Data, Keys),
    (   member(code, Keys)
    ->  process_code(Data.code, Response)
    ;   build("Nothing to eval.", Response)
    ).

process_code(Code, Response) :-
    (   read_term_from_atom(Code, Term, [variable_names(Vars)])
    ->  (
            catch(call(Term), _, fail),
            term_to_json(Vars, JSON),
            build(JSON, Response)
        )
    ;   build("No variables bound or eval error.", Response)
    ).

% build a response
build(Message, Response) :-
    Message = Response.
