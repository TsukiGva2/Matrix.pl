:- module(matriz, [
              escreve_matriz/1,
              identidade/2,
              elementar/3,
              matriz_mul/3
          ]).

:- use_module(library(clpfd), [transpose/2]).

% todo: refazer base das matrizes como uma lista plana
% para facilitar indexacao na multiplic.

matriz([I, J], Linhas) :-
    length(Linhas, I),
    maplist(colunas(J), Linhas).

escreve_matriz(matriz(_, Linhas)) :-
    escreve_matriz_(Linhas).

escreve_matriz_([]) :- !.
escreve_matriz_([Linha | Linhas]) :-
    write('('),
    maplist(format(' ~w'), Linha),
    write(' )'), nl,
    escreve_matriz_(Linhas).

% _______
% ( 1 0 )   ( 1| 0 )   ( [ 1 * 1 + 0 * 0 ] [ 0 * 1 + 0 * 0 ] )   ( 1 0 )
% ( 0 1 ) x ( 0| 1 ) = ( [ 0 * 1 + 1 * 0 ] [ 0 * 0 + 1 * 1 ] ) = ( 0 1 )
matriz_mul(
    matriz([I, J], M_1),
    matriz([J, K], M_2),
    matriz([I, K], M  )) :-

    matriz([I, J], M_1),
    matriz([J, K], M_2),
    matriz([I, K], M  ),

    transpose(M_2, T),
    maplist(linha_mul(T), M_1, M).

linha_mul(T, M_1_L, M_L) :-
    maplist(produto_escalar(M_1_L), T, M_L).

produto_escalar(V1, V2, V) :-
    foldl(produto_soma, V1, V2, 0, V).

produto_soma(X, Y, Ac, R) :-
    R is Ac + (X * Y).

% Como a matriz eh quadrada, entao: Ordem = I = J
identidade(Ordem, matriz([Ordem, Ordem], Linhas)) :-
    matriz([Ordem, Ordem], Linhas), % teste de validade
    padrao_diagonal(1, Linhas).

:- op(700, xfx, <->).
:- op(600, yfx, *).
:- op(500, yfx, +).

% troca duas linhas de pos
elementar(Ordem,
          L_1 ** L_2,
          matriz([Ordem, Ordem], Linhas)) :-

    matriz([Ordem, Ordem], Linhas),
    padrao_diagonal_trocado([L_1, L_2], 1, Linhas), !.

% multiplica linha L por constante C
elementar(Ordem,
          C * L,
          matriz([Ordem, Ordem], Linhas)) :-

    matriz([Ordem, Ordem], Linhas),
    padrao_diagonal_com_linha_escalada([L, C], 1, Linhas).

elementar(Ordem,
          L_1 + (C * L_2),
          matriz([Ordem, Ordem], Linhas)) :-

    matriz([Ordem, Ordem], Linhas),
    padrao_diagonal_com_soma_L_CL([L_1, C, L_2], 1, Linhas), !.

% inverte o predicado length para exercer
% um objetivo de limite no numero de colunas
colunas(N, L) :- length(L, N).

% uso esperado: padrao_diagonal(+N_linha, +Linhas)
% checagem da presença da 'stripe' da matriz identidade,
% por exemplo o formato da identidade de ordem 3:
%                         (1 0 0)
%                   I_3 = (0 1 0)
%                         (0 0 1)
padrao_diagonal(_, []) :- !.
padrao_diagonal(N_linha, [Linha | Linhas]) :-
    length(Linha, Colunas),

    % gera um intervalo [1..Colunas]
    numlist(1, Colunas, Indices),
    maplist(entrada_identidade(N_linha), Linha, Indices),

    Prox is N_linha + 1,
    padrao_diagonal(Prox, Linhas).

padrao_diagonal_trocado(_, _, []) :- !.
padrao_diagonal_trocado(Troca, N_linha, [Linha | Linhas]) :-
    length(Linha, Colunas),

    numlist(1, Colunas, Indices),

    (   member(N_linha, Troca)
    ->  maplist(entrada_identidade_trocada(Troca, N_linha), Linha, Indices)
    ;   maplist(entrada_identidade(N_linha), Linha, Indices)
    ),

    Prox is N_linha + 1,
    padrao_diagonal_trocado(Troca, Prox, Linhas).

padrao_diagonal_com_linha_escalada(_, _, []) :- !.
padrao_diagonal_com_linha_escalada(
    [L, C], N_linha, [Linha | Linhas]) :-

    length(Linha, Colunas),

    numlist(1, Colunas, Indices),

    (   N_linha =:= L
    ->  maplist(entrada_identidade_escalada(C, N_linha), Linha, Indices)
    ;   maplist(entrada_identidade(N_linha), Linha, Indices)
    ),

    Prox is N_linha + 1,
    padrao_diagonal_com_linha_escalada([L, C], Prox, Linhas).

padrao_diagonal_com_soma_L_CL(_, _, []) :- !.
padrao_diagonal_com_soma_L_CL(
    [L_1, C, L_2], N_linha, [Linha | Linhas]) :-

    length(Linha, Colunas),

    numlist(1, Colunas, Indices),

    (   N_linha =:= L_1
    ->  maplist(entrada_identidade_somada_por_CL_2(C, L_2, N_linha), Linha, Indices)
    ;   maplist(entrada_identidade(N_linha), Linha, Indices)
    ),

    Prox is N_linha + 1,
    padrao_diagonal_com_soma_L_CL([L_1, C, L_2], Prox, Linhas).

entrada_identidade_somada_por_CL_2(C, L_2, N_linha, E, Indice) :-
    (   Indice =:= L_2
    ->  E = C
    ;   ( Indice =:= N_linha
        ->  E = 1
        ;   E = 0
        )
    ).

entrada_identidade_escalada(C, N_linha, E, Indice) :-
    (   Indice =:= N_linha
    ->  E = C
    ;   E = 0
    ).

entrada_identidade_trocada([L_1, L_2], L_1, E, Indice) :-
    (   Indice =:= L_2
    ->  E = 1
    ;   E = 0
    ).
entrada_identidade_trocada([L_1, L_2], L_2, E, Indice) :-
    (   Indice =:= L_1
    ->  E = 1
    ;   E = 0
    ).

entrada_identidade(N_linha, E, Indice) :-
    (   Indice =:= N_linha
    ->  E = 1
    ;   E = 0
    ).
