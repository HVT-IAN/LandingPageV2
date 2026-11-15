export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** Represents a file upload. */
  Upload: { input: File; output: File; }
};

export type About = {
  __typename?: 'About';
  contentAlign: Scalars['String']['output'];
  contentColumns: Scalars['Int']['output'];
  contentHtml: Scalars['String']['output'];
  paragraphs: Array<Scalars['String']['output']>;
  photoAlt: Scalars['String']['output'];
  photoUrl: Scalars['String']['output'];
};

export type AboutInput = {
  contentAlign?: Scalars['String']['input'];
  contentColumns?: Scalars['Int']['input'];
  contentHtml?: Scalars['String']['input'];
  paragraphs?: Array<Scalars['String']['input']>;
  photoAlt?: Scalars['String']['input'];
  photoUrl?: Scalars['String']['input'];
};

export type ContactInput = {
  email: Scalars['String']['input'];
  message: Scalars['String']['input'];
  name: Scalars['String']['input'];
  website?: Scalars['String']['input'];
};

export type ContactResult = {
  __typename?: 'ContactResult';
  ok: Scalars['Boolean']['output'];
};

export type Health = {
  __typename?: 'Health';
  status: Scalars['String']['output'];
};

export type Landing = {
  __typename?: 'Landing';
  about: LandingAbout;
  projects: Array<LandingProject>;
  settings?: Maybe<SiteSettings>;
  skillGroups: Array<SkillGroup>;
  socialLinks: Array<LandingSocialLink>;
};

export type LandingAbout = {
  __typename?: 'LandingAbout';
  contentAlign: Scalars['String']['output'];
  contentColumns: Scalars['Int']['output'];
  contentHtml: Scalars['String']['output'];
  paragraphs: Array<Scalars['String']['output']>;
  photo: Photo;
};

export type LandingProject = {
  __typename?: 'LandingProject';
  dateLabel: Scalars['String']['output'];
  demoUrl: Scalars['String']['output'];
  description: Scalars['String']['output'];
  descriptionAlign: Scalars['String']['output'];
  descriptionColumns: Scalars['Int']['output'];
  featured: Scalars['Boolean']['output'];
  image: Photo;
  repoUrl: Scalars['String']['output'];
  role: Scalars['String']['output'];
  slug: Scalars['String']['output'];
  tags: Array<Scalars['String']['output']>;
  title: Scalars['String']['output'];
};

export type LandingSocialLink = {
  __typename?: 'LandingSocialLink';
  platform: Scalars['String']['output'];
  url: Scalars['String']['output'];
};

export type Message = {
  __typename?: 'Message';
  createdAt: Scalars['String']['output'];
  email: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  message: Scalars['String']['output'];
  name: Scalars['String']['output'];
  read: Scalars['Boolean']['output'];
};

export type MessagePage = {
  __typename?: 'MessagePage';
  items: Array<Message>;
  page: Scalars['Int']['output'];
  pageSize: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  createProject: Project;
  deleteMessage: Scalars['Boolean']['output'];
  deleteProject: Scalars['Boolean']['output'];
  /** Inicia sesión y guarda la cookie cms_session. */
  login: User;
  /** Borra la cookie de sesión. */
  logout: Scalars['Boolean']['output'];
  markMessageRead: Scalars['Boolean']['output'];
  /** Reordena; la lista debe contener todos los ids. */
  reorderProjects: Array<Project>;
  replaceSkills: Skills;
  replaceSocialLinks: Array<SocialLink>;
  /** Formulario público (honeypot y límite de 3/hora por IP). */
  submitContact: ContactResult;
  updateAbout: About;
  updateProject: Project;
  updateSettings: SiteSettings;
  /** Sube JPG/PNG/WebP (máx. 5 MB) y devuelve la URL en WebP. */
  uploadImage: UploadResult;
};


export type MutationCreateProjectArgs = {
  input: ProjectCreateInput;
};


export type MutationDeleteMessageArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteProjectArgs = {
  id: Scalars['Int']['input'];
};


export type MutationLoginArgs = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
};


export type MutationMarkMessageReadArgs = {
  id: Scalars['Int']['input'];
};


export type MutationReorderProjectsArgs = {
  ids: Array<Scalars['Int']['input']>;
};


export type MutationReplaceSkillsArgs = {
  groups: Array<SkillGroupInput>;
};


export type MutationReplaceSocialLinksArgs = {
  links: Array<SocialLinkInput>;
};


export type MutationSubmitContactArgs = {
  input: ContactInput;
};


export type MutationUpdateAboutArgs = {
  input: AboutInput;
};


export type MutationUpdateProjectArgs = {
  id: Scalars['Int']['input'];
  input: ProjectUpdateInput;
};


export type MutationUpdateSettingsArgs = {
  input: SettingsInput;
};


export type MutationUploadImageArgs = {
  file: Scalars['Upload']['input'];
};

export type Photo = {
  __typename?: 'Photo';
  alt: Scalars['String']['output'];
  url: Scalars['String']['output'];
};

export type Project = {
  __typename?: 'Project';
  dateLabel: Scalars['String']['output'];
  demoUrl: Scalars['String']['output'];
  description: Scalars['String']['output'];
  descriptionAlign: Scalars['String']['output'];
  descriptionColumns: Scalars['Int']['output'];
  featured: Scalars['Boolean']['output'];
  id: Scalars['Int']['output'];
  imageAlt: Scalars['String']['output'];
  imageUrl: Scalars['String']['output'];
  position: Scalars['Int']['output'];
  published: Scalars['Boolean']['output'];
  repoUrl: Scalars['String']['output'];
  role: Scalars['String']['output'];
  slug: Scalars['String']['output'];
  tags: Array<Scalars['String']['output']>;
  title: Scalars['String']['output'];
};

export type ProjectCreateInput = {
  dateLabel?: Scalars['String']['input'];
  demoUrl?: Scalars['String']['input'];
  description?: Scalars['String']['input'];
  descriptionAlign?: Scalars['String']['input'];
  descriptionColumns?: Scalars['Int']['input'];
  featured?: Scalars['Boolean']['input'];
  imageAlt?: Scalars['String']['input'];
  imageUrl?: Scalars['String']['input'];
  published?: Scalars['Boolean']['input'];
  repoUrl?: Scalars['String']['input'];
  role?: Scalars['String']['input'];
  slug: Scalars['String']['input'];
  tags?: Array<Scalars['String']['input']>;
  title: Scalars['String']['input'];
};

export type ProjectUpdateInput = {
  dateLabel?: InputMaybe<Scalars['String']['input']>;
  demoUrl?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  descriptionAlign?: InputMaybe<Scalars['String']['input']>;
  descriptionColumns?: InputMaybe<Scalars['Int']['input']>;
  featured?: InputMaybe<Scalars['Boolean']['input']>;
  imageAlt?: InputMaybe<Scalars['String']['input']>;
  imageUrl?: InputMaybe<Scalars['String']['input']>;
  published?: InputMaybe<Scalars['Boolean']['input']>;
  repoUrl?: InputMaybe<Scalars['String']['input']>;
  role?: InputMaybe<Scalars['String']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type Query = {
  __typename?: 'Query';
  about: About;
  /** Estado del servicio. Ruta permanente usada por Render. */
  health: Health;
  /** Usuario de la sesión actual. Requiere cookie cms_session. */
  me: User;
  /** Mensajes paginados, más recientes primero. */
  messages: MessagePage;
  projects: Array<Project>;
  /** Contenido público de la landing (equivalente a GET /public/landing). */
  publicLanding: Landing;
  settings: SiteSettings;
  skills: Skills;
  socialLinks: Array<SocialLink>;
};


export type QueryMessagesArgs = {
  page?: Scalars['Int']['input'];
  pageSize?: Scalars['Int']['input'];
  unreadOnly?: Scalars['Boolean']['input'];
};

export type SettingsInput = {
  availability?: InputMaybe<Scalars['String']['input']>;
  contactEmail?: InputMaybe<Scalars['String']['input']>;
  contactText?: InputMaybe<Scalars['String']['input']>;
  contactTitle?: InputMaybe<Scalars['String']['input']>;
  ctaPrimary?: InputMaybe<Scalars['String']['input']>;
  ctaSecondary?: InputMaybe<Scalars['String']['input']>;
  faviconUrl?: InputMaybe<Scalars['String']['input']>;
  frameText?: InputMaybe<Scalars['String']['input']>;
  heroHook?: InputMaybe<Scalars['String']['input']>;
  heroSubtitle?: InputMaybe<Scalars['String']['input']>;
  heroTitle?: InputMaybe<Scalars['String']['input']>;
  latitude?: InputMaybe<Scalars['String']['input']>;
  logoUrl?: InputMaybe<Scalars['String']['input']>;
  longitude?: InputMaybe<Scalars['String']['input']>;
  metaDescription?: InputMaybe<Scalars['String']['input']>;
  seoTitle?: InputMaybe<Scalars['String']['input']>;
};

export type SiteSettings = {
  __typename?: 'SiteSettings';
  availability: Scalars['String']['output'];
  contactEmail: Scalars['String']['output'];
  contactText: Scalars['String']['output'];
  contactTitle: Scalars['String']['output'];
  ctaPrimary: Scalars['String']['output'];
  ctaSecondary: Scalars['String']['output'];
  faviconUrl: Scalars['String']['output'];
  frameText: Scalars['String']['output'];
  heroHook: Scalars['String']['output'];
  heroSubtitle: Scalars['String']['output'];
  heroTitle: Scalars['String']['output'];
  latitude: Scalars['String']['output'];
  logoUrl: Scalars['String']['output'];
  longitude: Scalars['String']['output'];
  metaDescription: Scalars['String']['output'];
  seoTitle: Scalars['String']['output'];
};

export type SkillGroup = {
  __typename?: 'SkillGroup';
  name: Scalars['String']['output'];
  skills: Array<Scalars['String']['output']>;
};

export type SkillGroupInput = {
  name: Scalars['String']['input'];
  skills?: Array<Scalars['String']['input']>;
};

export type Skills = {
  __typename?: 'Skills';
  groups: Array<SkillGroup>;
};

export type SocialLink = {
  __typename?: 'SocialLink';
  platform: Scalars['String']['output'];
  url: Scalars['String']['output'];
  visible: Scalars['Boolean']['output'];
};

export type SocialLinkInput = {
  platform: Scalars['String']['input'];
  url: Scalars['String']['input'];
  visible?: Scalars['Boolean']['input'];
};

export type UploadResult = {
  __typename?: 'UploadResult';
  height: Scalars['Int']['output'];
  url: Scalars['String']['output'];
  width: Scalars['Int']['output'];
};

export type User = {
  __typename?: 'User';
  email: Scalars['String']['output'];
  id: Scalars['Int']['output'];
};

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = { __typename?: 'Query', me: { __typename?: 'User', id: number, email: string } };

export type UnreadMessagesCountQueryVariables = Exact<{ [key: string]: never; }>;


export type UnreadMessagesCountQuery = { __typename?: 'Query', messages: { __typename?: 'MessagePage', total: number } };

export type GetSettingsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetSettingsQuery = { __typename?: 'Query', settings: { __typename?: 'SiteSettings', seoTitle: string, metaDescription: string, logoUrl: string, faviconUrl: string, latitude: string, longitude: string, frameText: string, availability: string, heroTitle: string, heroSubtitle: string, heroHook: string, ctaPrimary: string, ctaSecondary: string, contactTitle: string, contactText: string, contactEmail: string } };

export type GetAboutQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAboutQuery = { __typename?: 'Query', about: { __typename?: 'About', paragraphs: Array<string>, contentHtml: string, contentColumns: number, contentAlign: string, photoUrl: string, photoAlt: string } };

export type GetProjectsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetProjectsQuery = { __typename?: 'Query', projects: Array<{ __typename?: 'Project', id: number, slug: string, title: string, dateLabel: string, role: string, description: string, descriptionColumns: number, descriptionAlign: string, imageUrl: string, imageAlt: string, repoUrl: string, demoUrl: string, tags: Array<string>, featured: boolean, published: boolean, position: number }> };

export type GetSkillsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetSkillsQuery = { __typename?: 'Query', skills: { __typename?: 'Skills', groups: Array<{ __typename?: 'SkillGroup', name: string, skills: Array<string> }> } };

export type GetSocialLinksQueryVariables = Exact<{ [key: string]: never; }>;


export type GetSocialLinksQuery = { __typename?: 'Query', socialLinks: Array<{ __typename?: 'SocialLink', platform: string, url: string, visible: boolean }> };

export type GetMessagesQueryVariables = Exact<{
  unreadOnly?: Scalars['Boolean']['input'];
  page?: Scalars['Int']['input'];
  pageSize?: Scalars['Int']['input'];
}>;


export type GetMessagesQuery = { __typename?: 'Query', messages: { __typename?: 'MessagePage', total: number, page: number, pageSize: number, items: Array<{ __typename?: 'Message', id: number, name: string, email: string, message: string, read: boolean, createdAt: string }> } };

export type LoginMutationVariables = Exact<{
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
}>;


export type LoginMutation = { __typename?: 'Mutation', login: { __typename?: 'User', id: number, email: string } };

export type LogoutMutationVariables = Exact<{ [key: string]: never; }>;


export type LogoutMutation = { __typename?: 'Mutation', logout: boolean };

export type UpdateSettingsMutationVariables = Exact<{
  input: SettingsInput;
}>;


export type UpdateSettingsMutation = { __typename?: 'Mutation', updateSettings: { __typename?: 'SiteSettings', seoTitle: string, metaDescription: string, logoUrl: string, faviconUrl: string, latitude: string, longitude: string, frameText: string, availability: string, heroTitle: string, heroSubtitle: string, heroHook: string, ctaPrimary: string, ctaSecondary: string, contactTitle: string, contactText: string, contactEmail: string } };

export type UpdateAboutMutationVariables = Exact<{
  input: AboutInput;
}>;


export type UpdateAboutMutation = { __typename?: 'Mutation', updateAbout: { __typename?: 'About', paragraphs: Array<string>, contentHtml: string, contentColumns: number, contentAlign: string, photoUrl: string, photoAlt: string } };

export type CreateProjectMutationVariables = Exact<{
  input: ProjectCreateInput;
}>;


export type CreateProjectMutation = { __typename?: 'Mutation', createProject: { __typename?: 'Project', id: number, slug: string, title: string, dateLabel: string, role: string, description: string, descriptionColumns: number, descriptionAlign: string, imageUrl: string, imageAlt: string, repoUrl: string, demoUrl: string, tags: Array<string>, featured: boolean, published: boolean, position: number } };

export type UpdateProjectMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  input: ProjectUpdateInput;
}>;


export type UpdateProjectMutation = { __typename?: 'Mutation', updateProject: { __typename?: 'Project', id: number, slug: string, title: string, dateLabel: string, role: string, description: string, descriptionColumns: number, descriptionAlign: string, imageUrl: string, imageAlt: string, repoUrl: string, demoUrl: string, tags: Array<string>, featured: boolean, published: boolean, position: number } };

export type DeleteProjectMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteProjectMutation = { __typename?: 'Mutation', deleteProject: boolean };

export type ReorderProjectsMutationVariables = Exact<{
  ids: Array<Scalars['Int']['input']> | Scalars['Int']['input'];
}>;


export type ReorderProjectsMutation = { __typename?: 'Mutation', reorderProjects: Array<{ __typename?: 'Project', id: number, slug: string, title: string, dateLabel: string, role: string, description: string, descriptionColumns: number, descriptionAlign: string, imageUrl: string, imageAlt: string, repoUrl: string, demoUrl: string, tags: Array<string>, featured: boolean, published: boolean, position: number }> };

export type ReplaceSkillsMutationVariables = Exact<{
  groups: Array<SkillGroupInput> | SkillGroupInput;
}>;


export type ReplaceSkillsMutation = { __typename?: 'Mutation', replaceSkills: { __typename?: 'Skills', groups: Array<{ __typename?: 'SkillGroup', name: string, skills: Array<string> }> } };

export type ReplaceSocialLinksMutationVariables = Exact<{
  links: Array<SocialLinkInput> | SocialLinkInput;
}>;


export type ReplaceSocialLinksMutation = { __typename?: 'Mutation', replaceSocialLinks: Array<{ __typename?: 'SocialLink', platform: string, url: string, visible: boolean }> };

export type MarkMessageReadMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type MarkMessageReadMutation = { __typename?: 'Mutation', markMessageRead: boolean };

export type DeleteMessageMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteMessageMutation = { __typename?: 'Mutation', deleteMessage: boolean };

export type UploadImageMutationVariables = Exact<{
  file: Scalars['Upload']['input'];
}>;


export type UploadImageMutation = { __typename?: 'Mutation', uploadImage: { __typename?: 'UploadResult', url: string, width: number, height: number } };
