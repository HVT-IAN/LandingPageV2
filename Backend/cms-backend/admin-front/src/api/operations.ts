// Documentos GraphQL consumidos por el panel y por graphql-codegen.

export const ME_QUERY = /* GraphQL */ `
  query Me {
    me {
      id
      email
    }
  }
`;

export const UNREAD_MESSAGES_COUNT_QUERY = /* GraphQL */ `
  query UnreadMessagesCount {
    messages(unreadOnly: true, page: 1, pageSize: 1) {
      total
    }
  }
`;

export const SETTINGS_QUERY = /* GraphQL */ `
  query GetSettings {
    settings {
      seoTitle
      metaDescription
      logoUrl
      faviconUrl
      latitude
      longitude
      frameText
      availability
      heroTitle
      heroSubtitle
      heroHook
      ctaPrimary
      ctaSecondary
      contactTitle
      contactText
      contactEmail
    }
  }
`;

export const ABOUT_QUERY = /* GraphQL */ `
  query GetAbout {
    about {
      paragraphs
      contentHtml
      contentColumns
      contentAlign
      photoUrl
      photoAlt
    }
  }
`;

export const PROJECTS_QUERY = /* GraphQL */ `
  query GetProjects {
    projects {
      id
      slug
      title
      dateLabel
      role
      description
      descriptionColumns
      descriptionAlign
      imageUrl
      imageAlt
      repoUrl
      demoUrl
      tags
      featured
      published
      position
    }
  }
`;

export const SKILLS_QUERY = /* GraphQL */ `
  query GetSkills {
    skills {
      groups {
        name
        skills
      }
    }
  }
`;

export const SOCIAL_LINKS_QUERY = /* GraphQL */ `
  query GetSocialLinks {
    socialLinks {
      platform
      url
      visible
    }
  }
`;

export const MESSAGES_QUERY = /* GraphQL */ `
  query GetMessages($unreadOnly: Boolean! = false, $page: Int! = 1, $pageSize: Int! = 20) {
    messages(unreadOnly: $unreadOnly, page: $page, pageSize: $pageSize) {
      items {
        id
        name
        email
        message
        read
        createdAt
      }
      total
      page
      pageSize
    }
  }
`;

export const LOGIN_MUTATION = /* GraphQL */ `
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      id
      email
    }
  }
`;

export const LOGOUT_MUTATION = /* GraphQL */ `
  mutation Logout {
    logout
  }
`;

export const UPDATE_SETTINGS_MUTATION = /* GraphQL */ `
  mutation UpdateSettings($input: SettingsInput!) {
    updateSettings(input: $input) {
      seoTitle
      metaDescription
      logoUrl
      faviconUrl
      latitude
      longitude
      frameText
      availability
      heroTitle
      heroSubtitle
      heroHook
      ctaPrimary
      ctaSecondary
      contactTitle
      contactText
      contactEmail
    }
  }
`;

export const UPDATE_ABOUT_MUTATION = /* GraphQL */ `
  mutation UpdateAbout($input: AboutInput!) {
    updateAbout(input: $input) {
      paragraphs
      contentHtml
      contentColumns
      contentAlign
      photoUrl
      photoAlt
    }
  }
`;

export const CREATE_PROJECT_MUTATION = /* GraphQL */ `
  mutation CreateProject($input: ProjectCreateInput!) {
    createProject(input: $input) {
      id
      slug
      title
      dateLabel
      role
      description
      descriptionColumns
      descriptionAlign
      imageUrl
      imageAlt
      repoUrl
      demoUrl
      tags
      featured
      published
      position
    }
  }
`;

export const UPDATE_PROJECT_MUTATION = /* GraphQL */ `
  mutation UpdateProject($id: Int!, $input: ProjectUpdateInput!) {
    updateProject(id: $id, input: $input) {
      id
      slug
      title
      dateLabel
      role
      description
      descriptionColumns
      descriptionAlign
      imageUrl
      imageAlt
      repoUrl
      demoUrl
      tags
      featured
      published
      position
    }
  }
`;

export const DELETE_PROJECT_MUTATION = /* GraphQL */ `
  mutation DeleteProject($id: Int!) {
    deleteProject(id: $id)
  }
`;

export const REORDER_PROJECTS_MUTATION = /* GraphQL */ `
  mutation ReorderProjects($ids: [Int!]!) {
    reorderProjects(ids: $ids) {
      id
      slug
      title
      dateLabel
      role
      description
      descriptionColumns
      descriptionAlign
      imageUrl
      imageAlt
      repoUrl
      demoUrl
      tags
      featured
      published
      position
    }
  }
`;

export const REPLACE_SKILLS_MUTATION = /* GraphQL */ `
  mutation ReplaceSkills($groups: [SkillGroupInput!]!) {
    replaceSkills(groups: $groups) {
      groups {
        name
        skills
      }
    }
  }
`;

export const REPLACE_SOCIAL_LINKS_MUTATION = /* GraphQL */ `
  mutation ReplaceSocialLinks($links: [SocialLinkInput!]!) {
    replaceSocialLinks(links: $links) {
      platform
      url
      visible
    }
  }
`;

export const MARK_MESSAGE_READ_MUTATION = /* GraphQL */ `
  mutation MarkMessageRead($id: Int!) {
    markMessageRead(id: $id)
  }
`;

export const DELETE_MESSAGE_MUTATION = /* GraphQL */ `
  mutation DeleteMessage($id: Int!) {
    deleteMessage(id: $id)
  }
`;

export const UPLOAD_IMAGE_MUTATION = /* GraphQL */ `
  mutation UploadImage($file: Upload!) {
    uploadImage(file: $file) {
      url
      width
      height
    }
  }
`;
