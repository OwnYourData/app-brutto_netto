Rails.application.routes.draw do
	scope "(:locale)", :locale => /en|de/ do
		root  'pages#index'
		match 'est',          to: 'pages#est',          via: 'post'
		match 'dienstnehmer', to: 'pages#dienstnehmer', via: 'post'
		match 'dienstgeber',  to: 'pages#dienstgeber',  via: 'post'
		match 'favicon',      to: 'pages#favicon',      via: 'get'
	end
end
