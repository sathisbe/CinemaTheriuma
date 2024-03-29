import React from 'react';
import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { GraphQLClient, gql } from 'graphql-request';

export const getServerSideProps: GetServerSideProps = async (ctx) => {
	const endpoint = process.env.GRAPHQL_ENDPOINT as string;
	const graphQLClient = new GraphQLClient(endpoint);
	const referringURL = ctx.req.headers?.referer || null;
	const pathArr = ctx.query.postpath as Array<string>;
	const path = pathArr.join('/');
	console.log(path);
	const fbclid = ctx.query.fbclid;
	
	const query = gql`
		{
			post(id: "/${path}/", idType: URI) {
				id
				excerpt
				title
				link
				dateGmt
				modifiedGmt
				content
    acfgoogle_news_url {
      googleNewsUrl
    }
				author {
					node {
						name
					}
				}
				seo{
				opengraphTitle
      opengraphImage{
        sourceUrl
      }
    }
				featuredImage {
					node {
						sourceUrl
						altText
					}
				}
			}
		}
	`;

	const data = await graphQLClient.request(query);
	if (!data.post) {
		return {
			notFound: true,
		};
	}
	// Redirect if Facebook is the referrer or request contains fbclid
	if (referringURL?.includes('facebook.com') || fbclid) {
		const query = gql`
			{
				post(id: "/${path}/", idType: URI) {
					id
					acfgoogle_news_url {
						googleNewsUrl
					}
				}
			}
		`;

		const data = await graphQLClient.request(query);
		const googleNewsUrl = data.post?.acfgoogle_news_url?.googleNewsUrl;

		if (googleNewsUrl) {
			return {
				redirect: {
					permanent: false,
					destination: googleNewsUrl,
				},
			};
		}

		// Redirect to default destination if googleNewsUrl is not available
		return {
			redirect: {
				permanent: false,
				destination: `${
					endpoint.replace(/(\/graphql\/)/, '/') + encodeURI(path as string)
				}`,
			},
		};
	}
	return {
		props: {
			path,
			post: data.post,
			host: ctx.req.headers.host,
		},
	};
};

interface PostProps {
	post: any;
	host: string;
	path: string;
}

const Post: React.FC<PostProps> = (props) => {
	const { post, host, path } = props;

	// to remove tags from excerpt
	const removeTags = (str: string) => {
  if (str === null || str === '') return '';
  else str = str.toString();
  return str.replace(/(<([^>]+)>)/gi, '').replace(/\[[^\]]*\]/, '').trim();
};




	return (
		<>
			<Head>
				<meta property="og:title" content={post.seo.opengraphTitle} />
				<meta name="description" content={removeTags(post.excerpt)} />
				<link rel="canonical" href={`https://${host}/${path}`} />
				<meta property="og:description" content={removeTags(post.excerpt)} />
				<meta property="og:url" content={`https://${host}/${path}`} />
				<meta property="og:type" content="article" />
				<meta property="og:locale" content="en_US" />
				<meta property="og:site_name" content={host.split('.')[0]} />
				<meta property="article:published_time" content={post.dateGmt} />
				<meta property="article:modified_time" content={post.modifiedGmt} />
				<meta property="og:image" content={post.seo.opengraphImage.sourceUrl} />
				<meta
					property="og:image:alt"
					content={post.featuredImage.node.altText || post.title}
				/>
				<title>{removeTags(post.excerpt)}</title>
				
			</Head>
			<div className="post-container">
        
			
				<h1>{post.seo.opengraphTitle}</h1>
				
				<img
					src={post.featuredImage.node.sourceUrl}
					alt={post.featuredImage.node.altText || post.title}
				/>
				<article dangerouslySetInnerHTML={{ __html: post.content }} />
				
        

			</div>
		</>
	);
};

export default Post;
