import { Sign } from "crypto";
import { createContext, ReactNode, useEffect, useState } from "react";

//importanto o destruidor de cookies
import { destroyCookie, setCookie, parseCookies } from "nookies";
//importando o router para acessar as rotas
import Router from "next/router";
import { api } from "@/services/apiClient";

import { ToastContainer, toast } from 'react-toastify';


type AuthContextData = {
    user: UserProps | undefined; //recebendo a propriedade de informações do usuário
    isAuthenticated: boolean; //recebendo a propriedade de se o usuário esta logado
    signIn: (credentials: SignInProps) =>  Promise<void> //recebendo a propriedade de dados de login do usuário
    signOut: () => void //recebendo a propriedade de deslogar
    signUp: (credentials: SignUpProps) => Promise<void>//recebendo a propriedade de informações de cadastro
}

//tipagem de informações do usuário
type UserProps = {
    id: string;
    name: string;
    email: string;
}

//credenciais de email e senha para login
type SignInProps = {
    email: string;
    password: string;
}

type SignUpProps = {
    name: string;
    email: string;
    password: string;
}

type AuthProviderProps = {
    //children é o componente para renderizar as páginas
    children: ReactNode
}

//recebendo o contexto doq vamos usar e recebendo a tipagem com as propriedades
export const AuthContext = createContext({} as AuthContextData)


//função de deslogar
export function signOut(){
    try{
        destroyCookie(undefined, '@nextauth.token') //destruindo a sessão do usuário
        Router.push('/')// mandando o usuário de volta a tela inicial (login)
    }catch{
        console.log('erro ao deslogar')
    }
}


//onde vai prover informaçoes e ter os métodos
export function AuthProvider({ children }: AuthProviderProps){
    
    //armazenar as informações de quando o usuário fizer o login
    const[user, setUser] = useState<UserProps>()
    
    //uma variável com base no user
    //se o usário não estiver logado o isAuthenticated será falso, se tiver logado será verdadeiro
    const isAuthenticated = !!user; //convertendo a variável do user como booleano com as interrogações


    //CICLO DE VIDA COM USE-EFFECT PARA GARANTIR SEGURANÇA DE SE O USUÁRIO ESTIVER REALMENTE LOGADO
    useEffect(() => {
        
        //Tentar pegar algo no cookie que é nosso token
        const { '@nextauth.token': token } = parseCookies();

        if(token){
            api.get('/me').then(response => {
                const { id, name, email } = response.data; //a resposta da requisição é sempre no response.data
                setUser({
                    id,
                    name,
                    email
                })
            })
            .catch(() => {
                //SE DEU ERRO, DESLOGAMOS O USUÁRIO
                signOut()
            })
        }
    },[])

    //recebendo os dados de LOGIN
    async function signIn({ email, password }: SignInProps){
        //tentanto logar buscando os dados da rota /session da API
        try{
            const response = await api.post('/session',{
                email,
                password
        })

        //desconstruindo o response data
        const { id, name, token } = response.data;

        //SALVANDO o cookie de autenticação em session
        setCookie(undefined, '@nextauth.token', token,{
            maxAge: 60 * 60 * 24, //tempo de expiração de um mes
            path: "/" //Quais caminhos terão acesso aos cookies
        })
        //console.log(response.data);

        //passando para o user os dados de login (ja logado)
        setUser({
            id,
            name,
            email,
        })

        //Passando o token para manter-lo nas próximas requisiçoes
        api.defaults.headers['Authorization'] = `Bearer ${token}`

       
        toast.success("Logado com sucesso!")


        //Redirecionar o user para o /dashboard
        Router.push("/dashboard")

        }catch(err){
            toast.error("Erro ao acessar")
    
        }
    }

    //recebendo dados de CADASTRO
    async function signUp({ name, email, password }: SignUpProps){
        try{

            //salvando os dados na API
            const response = await api.post('/users',{
                name,
                email,
                password
            })

            toast.success("Conta criada com sucesso!")

            Router.push('/')

        }catch(err){
            toast.error("Erro ao cadastrar")
        }
    }


    return(
        //retornando o provider
        //dentro do value qualquer componente depois poderá acessar
        <AuthContext.Provider value={{ user, isAuthenticated, signIn, signOut, signUp }}>
            {children}
        </AuthContext.Provider>
    )
}