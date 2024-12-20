import { useEffect, useState } from 'react';
import { Box, CSSReset, Grid, ChakraProvider } from '@chakra-ui/react';
import moment from 'moment';
import InfiniteScroll from 'react-infinite-scroller';
import { Filter } from './components/Filter';
import { Loading } from './components/Loading';
import { Meeting } from './components/Meeting';
import { NoResults } from './components/NoResults';
import {
  Meeting as MeetingType,
  State,
  dataUrl,
  filter,
  getLangCodeFromCurrentURL,
  getLanguage,
  i18n,
  isLanguageCode,
  languages,
  load,
  meetingsPerPage,
  setQuery
} from './helpers';
// import staticData from './meetings-es.json';

console.log('6.28 pm 20/12/24');

export const App = () => {
  //check out query string
  const query = new URLSearchParams(window.location.search);
  const queryLang = query.get('lang');
  const language = isLanguageCode(queryLang) ? queryLang : getLanguage();
  const direction = languages[language].rtl ? 'rtl' : 'ltr';

  const [loading, setLoading] = useState(true);

  let current_lang = getLangCodeFromCurrentURL() || 'en';

  const [state, setState] = useState<State>({
    filters: {
      days: [],
      times: [],
      formats: [],
      types: []
    },
    limit: meetingsPerPage,
    loaded: false,
    meetings: [],
    search: '',
    timezone: '',
    language,
    languages: []
  });

  const [searchWords, setSearchWords] = useState<string[]>([]);

  useEffect(() => {
    setQuery(state);
  }, [state]);

  useEffect(() => {
    setSearchWords(
      state.search
        .toLowerCase()
        .split(' ')
        .filter(e => e)
    );
  }, [state.search]);

  //set html attributes
  document.documentElement.lang = language;
  document.documentElement.dir = direction;

  //function to remove a tag
  const toggleTag = (filter: string, value: string, checked: boolean): void => {
    //loop through and add the tag
    state.filters[filter].forEach(tag => {
      if (tag.tag === value) {
        tag.checked = checked;
      } else if (['days', 'formats', 'language'].includes(filter)) {
        //if we're setting a tag or format, uncheck the others
        tag.checked = false;
      }
    });
    //this will cause a re-render; the actual filtering is done in filterData
    setState({ ...state });
  };

  let pathFetch = '';
  if (current_lang) {
    pathFetch = `https://meetings.staging.al-anon.org/${current_lang}/apps/meeting-finder/meetings.json`;
    moment.locale(current_lang);
  } else {
    pathFetch =
      'https://meetings.staging.al-anon.org/apps/meeting-finder/meetings.json';
  }

  //on first render, get data
  if (loading) {
    setLoading(false);
    fetch(pathFetch || dataUrl)
      .then(result => result.json())
      .then(result => {
        // result = staticData;
        setState(
          load(result, query, state.language, languages[state.language].strings)
        );
      });
  }

  //get currently-checked tags
  const tags: string[] = Object.keys(state.filters)
    .map(filter =>
      state.filters[filter]
        .filter(value => value.checked)
        .map(value => value.tag)
    )
    .flat();

  const [filteredMeetings, currentDays] = filter(
    state,
    tags,
    languages[state.language].strings
  );

  // console.log(state.language)

  return (
    <i18n.Provider
      value={{
        language: state.language,
        rtl: languages[state.language].rtl,
        strings: languages[state.language].strings
      }}
    >
      <ChakraProvider>
        <CSSReset />
        {!state.loaded ? (
          <Loading />
        ) : (
          <Box
            as="main"
            maxW={1240}
            minH="100%"
            w="100%"
            mx="auto"
            p={{ base: 3, md: 6 }}
          >
            <Grid
              as="section"
              gap={{ base: 3, md: 6 }}
              templateColumns={{
                md: 'auto 300px'
              }}
            >
              <Box as="section" order={{ base: 1, md: 2 }}>
                <Filter
                  setSearch={(search: string) => setState({ ...state, search })}
                  setTimezone={(timezone: string) =>
                    setState({ ...state, timezone })
                  }
                  state={state}
                  currentDays={currentDays}
                  toggleTag={toggleTag}
                />
              </Box>
              <Box order={{ base: 2, md: 1 }}>
                {!filteredMeetings.length && (
                  <NoResults
                    state={state}
                    toggleTag={toggleTag}
                    clearSearch={() => setState({ ...state, search: '' })}
                  />
                )}
                {!!filteredMeetings.length && (
                  <InfiniteScroll
                    loadMore={() => {
                      const limit = state.limit + meetingsPerPage;
                      setState({ ...state, limit });
                    }}
                    hasMore={filteredMeetings.length > state.limit}
                  >
                    {filteredMeetings
                      .slice(0, state.limit)
                      .map((meeting: MeetingType, index: number) => (
                        <Meeting
                          key={index}
                          meeting={meeting}
                          searchWords={searchWords}
                          tags={tags}
                        />
                      ))}
                  </InfiniteScroll>
                )}
              </Box>
            </Grid>
          </Box>
        )}
      </ChakraProvider>
    </i18n.Provider>
  );
};
